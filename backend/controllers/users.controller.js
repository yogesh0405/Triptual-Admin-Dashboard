import { firstColumn, pool, quoteIdentifier, tableColumns } from '../modules/db.js';
import bcrypt from 'bcryptjs';

async function findUsersTable() {
  const tables = await tableColumns(['users', 'user', 'accounts', 'profiles']);
  for (const name of ['users', 'user', 'accounts', 'profiles']) if (tables.has(name)) return { name, columns: tables.get(name) };
  return null;
}
const normalizeRole = (value) => value.toLowerCase().includes('vip') ? 'VIP' : value.toLowerCase().includes('organ') ? 'Organizer' : 'Traveler';
const normalizeStatus = (value) => value.toLowerCase().includes('suspend') ? 'Suspended' : value.toLowerCase().includes('pend') ? 'Pending' : 'Active';
const initials = (value) => value.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();

export async function listUsers(_req, res) {
  const table = await findUsersTable();
  if (!table) return res.json({ users: [], total: 0 });
  const relatedTables = await tableColumns(['groups', 'expenses']);
  const expression = (aliases, fallback) => { const column = firstColumn(table.columns, aliases); return column ? quoteIdentifier(column) : fallback; };
  const usersTable = quoteIdentifier(table.name);
  const id = expression(['id', 'user_id'], 'ctid');
  const joined = firstColumn(table.columns, ['created_at', 'joined_at', 'createdat']);
  const groupsTable = relatedTables.get('groups');
  const expensesTable = relatedTables.get('expenses');
  const groupsCreatedBy = groupsTable && firstColumn(groupsTable, ['created_by', 'creator_id', 'owner_id']);
  const expensesUser = expensesTable && firstColumn(expensesTable, ['paid_by', 'user_id', 'created_by']);
  const tripsCount = groupsCreatedBy ? `(SELECT COUNT(*)::int FROM "groups" WHERE ${quoteIdentifier(groupsCreatedBy)}::text = ${usersTable}.${quoteIdentifier(firstColumn(table.columns, ['id', 'user_id']) ?? 'id')}::text)` : '0';
  const totalSpend = expensesUser ? `(SELECT COALESCE(SUM(amount), 0)::numeric FROM "expenses" WHERE ${quoteIdentifier(expensesUser)}::text = ${usersTable}.${quoteIdentifier(firstColumn(table.columns, ['id', 'user_id']) ?? 'id')}::text)` : '0';
  const query = `SELECT ${id}::text id, COALESCE(${expression(['name', 'full_name', 'username'], 'NULL')}::text, 'Unnamed user') name, COALESCE(${expression(['email', 'email_address', 'email_id'], "''")}::text, '') email, COALESCE(${expression(['phone', 'phone_number', 'mobile'], "''")}::text, '') phone, COALESCE(${expression(['role', 'user_role'], "'Traveler'")}::text, 'Traveler') role, COALESCE(${expression(['status', 'account_status'], "'Active'")}::text, 'Active') status, ${expression(['created_at', 'joined_at', 'createdat'], 'NULL')} joined_date, COALESCE(${expression(['is_verified', 'verified', 'email_verified'], 'false')}::boolean, false) is_verified, ${expression(['upi_id', 'upi'], 'NULL')}::text upi_id, ${expression(['travel_style', 'travelstyle'], 'NULL')}::text travel_style, ${expression(['updated_at', 'last_active', 'last_login_at'], 'NULL')} last_active, ${expression(['is_temp', 'temporary'], 'false')}::boolean is_temp, ${expression(['avatar', 'avatar_url'], 'NULL')}::text avatar, ${expression(['currency'], 'NULL')}::text currency, ${expression(['dob', 'date_of_birth'], 'NULL')} date_of_birth, ${expression(['push_token', 'device_token'], 'NULL')}::text push_token, ${tripsCount} trips_count, ${totalSpend} total_spend FROM ${usersTable}${joined ? ` ORDER BY ${quoteIdentifier(joined)} DESC` : ''}`;
  const result = await pool.query(query);
  const users = result.rows.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: normalizeRole(String(user.role)),
    status: normalizeStatus(String(user.status)),
    joinedDate: user.joined_date,
    isVerified: user.is_verified,
    upiId: user.upi_id,
    travelStyle: user.travel_style,
    isTemp: user.is_temp,
    avatar: user.avatar,
    currency: user.currency,
    dateOfBirth: user.date_of_birth,
    pushToken: user.push_token,
    avatarColor: '#2E331B',
    avatarInitials: initials(String(user.name)),
    tripsCount: Number(user.trips_count),
    totalSpend: Number(user.total_spend),
    lastActive: user.last_active ?? 'Unknown',
  }));
  return res.json({ users, total: result.rowCount });
}

export async function updateUserStatus(req, res) {
  const table = await findUsersTable();
  if (!table) return res.status(404).json({ error: 'Users table not found' });
  const status = String(req.body?.status ?? '');
  if (!['Active', 'Pending', 'Suspended'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  const id = firstColumn(table.columns, ['id', 'user_id']) ?? 'id';
  let statusColumn = firstColumn(table.columns, ['status', 'account_status']);
  if (!statusColumn && table.name === 'users') {
    await pool.query(`ALTER TABLE ${quoteIdentifier(table.name)} ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Active'`);
    statusColumn = 'status';
  }
  if (!statusColumn) return res.status(400).json({ error: 'User status column not found' });
  const result = await pool.query(`UPDATE ${quoteIdentifier(table.name)} SET ${quoteIdentifier(statusColumn)} = $1 WHERE ${quoteIdentifier(id)}::text = $2 RETURNING ${quoteIdentifier(id)}::text id`, [status, req.params.id]);
  if (!result.rowCount) return res.status(404).json({ error: 'User not found' });
  return res.json({ ok: true });
}

export async function updateUserPassword(req, res) {
  const table = await findUsersTable();
  if (!table) return res.status(404).json({ error: 'Users table not found' });
  const password = String(req.body?.password ?? '');
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  const id = firstColumn(table.columns, ['id', 'user_id']);
  const passwordColumn = firstColumn(table.columns, ['password_hash', 'password']);
  if (!id || !passwordColumn) return res.status(400).json({ error: 'User password column not found' });
  const hash = await bcrypt.hash(password, 12);
  const result = await pool.query(`UPDATE ${quoteIdentifier(table.name)} SET ${quoteIdentifier(passwordColumn)} = $1 WHERE ${quoteIdentifier(id)}::text = $2 RETURNING ${quoteIdentifier(id)}::text id`, [hash, req.params.id]);
  if (!result.rowCount) return res.status(404).json({ error: 'User not found' });
  return res.json({ ok: true });
}

export async function registerPushToken(req, res) {
  const { userId, token, deviceType = 'android' } = req.body;
  if (!userId || !token) return res.status(400).json({ error: 'userId and token are required' });

  try {
    const table = await findUsersTable();
    if (table) {
      const usersTable = quoteIdentifier(table.name);
      const idCol = firstColumn(table.columns, ['id', 'user_id']) ?? 'id';
      const pushCol = firstColumn(table.columns, ['push_token', 'device_token', 'fcm_token']) ?? 'push_token';
      await pool.query(`UPDATE ${usersTable} SET ${quoteIdentifier(pushCol)} = $1 WHERE ${quoteIdentifier(idCol)}::text = $2`, [token, userId]);
    }

    const pushTables = await tableColumns(['user_push_tokens']);
    if (pushTables.has('user_push_tokens')) {
      await pool.query(`
        INSERT INTO user_push_tokens (user_id, token, device_type, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
      `, [userId, token, deviceType]).catch(() => undefined);
    }

    return res.json({ success: true, message: 'FCM push token registered successfully' });
  } catch (error) {
    console.error('❌ Error registering push token:', error);
    return res.status(500).json({ error: 'Failed to register push token' });
  }
}
