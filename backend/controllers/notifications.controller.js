import { firstColumn, pool, quoteIdentifier, tableColumns } from '../modules/db.js';
import { getMessaging } from '../utils/firebase.js';
import { sendAdminBroadcastEmail } from '../utils/mail.util.js';
import { publishNotificationEvent } from '../utils/kafka.js';

async function findUsersTable() {
  const tables = await tableColumns(['users', 'user', 'accounts', 'profiles']);
  for (const name of ['users', 'user', 'accounts', 'profiles']) {
    if (tables.has(name)) return { name, columns: tables.get(name) };
  }
  return null;
}

// Fetch all target users and device tokens based on filter
async function fetchTargetUsers(targetAudience, userIds = []) {
  const table = await findUsersTable();
  if (!table) return [];

  const usersTable = quoteIdentifier(table.name);
  const expression = (aliases, fallback) => {
    const col = firstColumn(table.columns, aliases);
    return col ? quoteIdentifier(col) : fallback;
  };

  const idCol = expression(['id', 'user_id'], 'ctid');
  const emailCol = expression(['email_id', 'email', 'email_address'], "''");
  const roleCol = expression(['role', 'user_role'], "'Traveler'");
  const pushCol = expression(['push_token', 'device_token', 'fcm_token', 'token'], 'NULL');
  const nameCol = expression(['username', 'name', 'full_name'], "'User'");

  let whereClause = '';
  const params = [];

  if (targetAudience && targetAudience.startsWith('role:')) {
    const roleName = targetAudience.replace('role:', '');
    params.push(roleName);
    whereClause = `WHERE LOWER(${roleCol}::text) LIKE LOWER($1)`;
  } else if (targetAudience === 'custom' && Array.isArray(userIds) && userIds.length > 0) {
    params.push(userIds);
    whereClause = `WHERE ${idCol}::text = ANY($1::text[])`;
  }

  const query = `
    SELECT 
      ${idCol}::text AS id,
      COALESCE(${emailCol}::text, '') AS email,
      COALESCE(${nameCol}::text, 'User') AS name,
      COALESCE(${pushCol}::text, '') AS push_token
    FROM ${usersTable}
    ${whereClause}
  `;

  try {
    const result = await pool.query(query, params);
    let users = result.rows;

    // Check user_push_tokens and other device token tables for additional FCM tokens
    const extraTables = await tableColumns(['user_push_tokens', 'device_tokens', 'user_devices', 'fcm_tokens']);
    for (const tableName of ['user_push_tokens', 'device_tokens', 'user_devices', 'fcm_tokens']) {
      if (extraTables.has(tableName)) {
        const devTable = quoteIdentifier(tableName);
        const devCols = extraTables.get(tableName);
        const devUserCol = firstColumn(devCols, ['user_id', 'id']);
        const devTokenCol = firstColumn(devCols, ['token', 'fcm_token', 'device_token', 'push_token']);

        if (devUserCol && devTokenCol) {
          const devQuery = `
            SELECT ${quoteIdentifier(devUserCol)}::text AS user_id, ${quoteIdentifier(devTokenCol)}::text AS push_token 
            FROM ${devTable} 
            WHERE ${quoteIdentifier(devTokenCol)} IS NOT NULL AND ${quoteIdentifier(devTokenCol)} != ''
            ORDER BY created_at DESC
          `;
          const devResult = await pool.query(devQuery).catch(() => ({ rows: [] }));
          
          const tokenMap = new Map();
          for (const row of devResult.rows) {
            if (!tokenMap.has(row.user_id)) {
              tokenMap.set(row.user_id, row.push_token);
            }
          }

          users = users.map(u => ({
            ...u,
            push_token: u.push_token || tokenMap.get(u.id) || ''
          }));
        }
      }
    }

    return users;
  } catch (error) {
    console.error('❌ [Notifications Controller] DB fetch failed:', error.message);
    return [];
  }
}

// 1. Get Live Audience Count & Reachable Channels
export async function getAudienceCount(req, res) {
  try {
    const audience = String(req.query.audience || 'all');
    const users = await fetchTargetUsers(audience);

    const totalUsers = users.length;
    const pushTokenCount = users.filter(u => u.push_token && u.push_token.trim().length > 0).length;
    const emailCount = users.filter(u => u.email && u.email.includes('@')).length;

    return res.json({
      success: true,
      audience,
      totalUsers,
      pushTokenCount,
      emailCount,
      inAppCount: totalUsers
    });
  } catch (error) {
    console.error('❌ Error getting audience count:', error);
    return res.status(500).json({ error: 'Failed to calculate audience count' });
  }
}

// 2. Broadcast Notification Handler (Push FCM, In-App DB, Email)
export async function sendBroadcast(req, res) {
  try {
    const { title, body, channels = [], targetAudience = 'all', actionUrl = '', category = 'general', userIds = [] } = req.body;

    if (!title || !body) {
      return res.status(400).json({ error: 'Notification title and body are required' });
    }
    if (!Array.isArray(channels) || channels.length === 0) {
      return res.status(400).json({ error: 'At least one notification channel (push, inapp, email) must be selected' });
    }

    const users = await fetchTargetUsers(targetAudience, userIds);
    if (users.length === 0) {
      return res.status(404).json({ error: 'No target users found for the selected audience' });
    }

    const stats = {
      targetedUsers: users.length,
      pushSent: 0,
      pushFailed: 0,
      inappCreated: 0,
      emailSent: 0,
      emailFailed: 0,
      isSimulatedPush: false
    };

    // ── Channel 1: Push Notification via FCM ──
    if (channels.includes('push')) {
      const validTokens = users
        .map(u => u.push_token)
        .filter(t => t && typeof t === 'string' && t.trim().length > 10);

      const messaging = getMessaging();

      if (messaging && validTokens.length > 0) {
        // FCM multicast in batches of 500
        const batchSize = 500;
        for (let i = 0; i < validTokens.length; i += batchSize) {
          const batch = validTokens.slice(i, i + batchSize);
          const message = {
            notification: { title, body },
            data: {
              actionUrl: String(actionUrl || ''),
              category: String(category || 'general'),
              click_action: 'FLUTTER_NOTIFICATION_CLICK'
            },
            tokens: batch
          };

          try {
            const response = await messaging.sendEachForMulticast(message);
            stats.pushSent += response.successCount;
            stats.pushFailed += response.failureCount;
            console.log(`✅ [FCM Multicast] Batch sent. Success: ${response.successCount}, Failed: ${response.failureCount}`);
          } catch (fcmErr) {
            console.error('❌ [FCM Multicast Error]:', fcmErr.message);
            stats.pushFailed += batch.length;
          }
        }
      } else {
        // Mock / Simulation mode if no FCM or tokens
        stats.isSimulatedPush = true;
        stats.pushSent = validTokens.length > 0 ? validTokens.length : users.length;
        console.log(`ℹ️ [FCM Simulation] Broadcasted push to ${stats.pushSent} target devices.`);
      }
    }

    // ── Channel 2: In-App Notification (Database Insertion) ──
    if (channels.includes('inapp')) {
      try {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const insertQuery = `
            INSERT INTO user_notifications (user_id, title, body, type, action_url, category, is_read, created_at)
            VALUES ($1, $2, $3, 'broadcast', $4, $5, false, NOW())
          `;
          for (const u of users) {
            await client.query(insertQuery, [u.id, title, body, actionUrl || '', category || 'general']);
            stats.inappCreated++;
          }
          await client.query('COMMIT');
          console.log(`✅ [In-App DB] Successfully created ${stats.inappCreated} in-app notification records.`);
        } catch (dbErr) {
          await client.query('ROLLBACK');
          console.error('❌ [In-App DB Error]:', dbErr.message);
        } finally {
          client.release();
        }
      } catch (err) {
        console.error('❌ [In-App DB Connection Error]:', err.message);
      }
    }

    // ── Channel 3: Email Notification ──
    if (channels.includes('email')) {
      const emailUsers = users.filter(u => u.email && u.email.includes('@'));
      for (const u of emailUsers) {
        try {
          const res = await sendAdminBroadcastEmail(u.email, u.name, title, body, actionUrl);
          if (res.success) stats.emailSent++;
          else stats.emailFailed++;
        } catch (mailErr) {
          console.warn(`❌ [Email Dispatch Error] ${u.email}:`, mailErr.message);
          stats.emailFailed++;
        }
      }
      console.log(`✅ [Email Dispatch] Processed ${emailUsers.length} emails. Sent: ${stats.emailSent}, Failed: ${stats.emailFailed}`);
    }

    // ── Channel 4: Kafka Notification Engine Event Stream ──
    try {
      const kafkaRes = await publishNotificationEvent('SYSTEM_ALERT', {
        userId: null, // Broadcast to all target users
        title,
        body,
        channels,
        targetAudience,
        actionUrl,
        category,
        data: { source: 'ADMIN_DASHBOARD' }
      });
      stats.kafkaEventQueued = kafkaRes.success;
      if (kafkaRes.eventId) stats.kafkaEventId = kafkaRes.eventId;
    } catch (kErr) {
      console.warn('⚠️ [Kafka Dispatch Error]:', kErr.message);
      stats.kafkaEventQueued = false;
    }

    // ── Save Broadcast Log Record ──
    try {
      await pool.query(
        `INSERT INTO broadcast_notifications (title, body, channels, target_audience, action_url, category, stats, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, NOW())`,
        [title, body, channels, targetAudience, actionUrl || '', category || 'general', JSON.stringify(stats)]
      );
    } catch (logErr) {
      console.error('⚠️ Could not save broadcast log:', logErr.message);
    }

    return res.json({
      success: true,
      message: 'Broadcast notification executed successfully',
      stats
    });
  } catch (error) {
    console.error('❌ Error sending broadcast notification:', error);
    return res.status(500).json({ error: 'Failed to process broadcast notification', details: error.message });
  }
}

// 3. Get Broadcast History Log
export async function getBroadcastHistory(_req, res) {
  try {
    const result = await pool.query(
      `SELECT id, title, body, channels, target_audience, action_url, category, stats, created_at
       FROM broadcast_notifications
       ORDER BY created_at DESC
       LIMIT 50`
    );

    return res.json({
      success: true,
      broadcasts: result.rows
    });
  } catch (error) {
    console.error('❌ Error fetching broadcast history:', error);
    return res.json({ success: true, broadcasts: [] });
  }
}
