import crypto from 'crypto';
import { pool } from '../modules/db.js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

/**
 * 1. List all tickets with search, filtering, and summary statistics
 */
export async function listTickets(req, res) {
  try {
    const { status, category, search } = req.query;
    let query = `
      SELECT t.id, t.ticket_number AS "ticketNumber", t.category, t.subject, t.message, t.status,
             t.attachment_name AS "attachmentName", t.attachment_type AS "attachmentType",
             t.attachment_size AS "attachmentSize", t.attachment_url AS "attachmentUrl",
             t.created_at AS "createdAt", t.user_id AS "userId",
             COALESCE(u.username, 'Traveler') AS "userName",
             COALESCE(u.email_id, '') AS "userEmail",
             COALESCE(u.phone, '') AS "userPhone",
             COALESCE(u.avatar, '') AS "userAvatar",
             (SELECT COUNT(*)::int FROM support_ticket_messages m WHERE m.ticket_id = t.id) AS "messagesCount",
             (SELECT m2.message FROM support_ticket_messages m2 WHERE m2.ticket_id = t.id ORDER BY m2.created_at DESC LIMIT 1) AS "lastMessage"
      FROM support_tickets t
      LEFT JOIN users u ON t.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'all' && status !== 'ALL') {
      params.push(status.toUpperCase());
      query += ` AND UPPER(t.status) = $${params.length}`;
    }

    if (category && category !== 'all' && category !== 'ALL') {
      params.push(category.toLowerCase());
      query += ` AND LOWER(t.category) = $${params.length}`;
    }

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      query += ` AND (
        LOWER(t.ticket_number) LIKE $${params.length} OR
        LOWER(t.subject) LIKE $${params.length} OR
        LOWER(t.message) LIKE $${params.length} OR
        LOWER(COALESCE(u.username, '')) LIKE $${params.length} OR
        LOWER(COALESCE(u.email_id, '')) LIKE $${params.length}
      )`;
    }

    query += ` ORDER BY t.created_at DESC`;

    const result = await pool.query(query, params);

    // Compute stats
    const statsRes = await pool.query(`
      SELECT 
        COUNT(*)::int AS total,
        COUNT(CASE WHEN UPPER(status) = 'OPEN' THEN 1 END)::int AS open,
        COUNT(CASE WHEN UPPER(status) = 'IN_PROGRESS' THEN 1 END)::int AS in_progress,
        COUNT(CASE WHEN UPPER(status) IN ('RESOLVED', 'CLOSED') THEN 1 END)::int AS resolved
      FROM support_tickets
    `);

    const stats = statsRes.rows[0] || { total: 0, open: 0, in_progress: 0, resolved: 0 };

    return res.json({
      success: true,
      tickets: result.rows,
      total: result.rowCount,
      stats: {
        total: Number(stats.total) || 0,
        open: Number(stats.open) || 0,
        inProgress: Number(stats.in_progress) || 0,
        resolved: Number(stats.resolved) || 0,
      }
    });
  } catch (error) {
    console.error('❌ [Tickets Controller] listTickets error:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve tickets', details: error.message });
  }
}

/**
 * 2. Get single ticket details and conversation thread
 */
export async function getTicketDetails(req, res) {
  const { ticketNumber } = req.params;
  if (!ticketNumber) {
    return res.status(400).json({ success: false, error: 'Ticket number is required' });
  }

  try {
    const ticketRes = await pool.query(
      `SELECT t.id, t.ticket_number AS "ticketNumber", t.category, t.subject, t.message, t.status,
              t.attachment_name AS "attachmentName", t.attachment_type AS "attachmentType",
              t.attachment_size AS "attachmentSize", t.attachment_url AS "attachmentUrl",
              t.created_at AS "createdAt", t.user_id AS "userId",
              COALESCE(u.username, 'Traveler') AS "userName",
              COALESCE(u.email_id, '') AS "userEmail",
              COALESCE(u.phone, '') AS "userPhone",
              COALESCE(u.avatar, '') AS "userAvatar"
       FROM support_tickets t
       LEFT JOIN users u ON t.user_id = u.id
       WHERE t.ticket_number = $1
       LIMIT 1`,
      [ticketNumber]
    );

    if (ticketRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    const ticket = ticketRes.rows[0];

    const messagesRes = await pool.query(
      `SELECT m.id, m.ticket_id AS "ticketId", m.sender_id AS "senderId", m.sender_name AS "senderName",
              m.sender_role AS "senderRole", m.message, m.attachment_url AS "attachmentUrl",
              m.attachment_name AS "attachmentName", m.attachment_type AS "attachmentType",
              m.attachment_size AS "attachmentSize", m.created_at AS "createdAt"
       FROM support_ticket_messages m
       WHERE m.ticket_id = $1
       ORDER BY m.created_at ASC`,
      [ticket.id]
    );

    return res.json({
      success: true,
      ticket,
      messages: messagesRes.rows,
    });
  } catch (error) {
    console.error('❌ [Tickets Controller] getTicketDetails error:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve ticket details', details: error.message });
  }
}

/**
 * 3. Update ticket status (e.g. OPEN, IN_PROGRESS, RESOLVED, CLOSED)
 */
export async function updateTicketStatus(req, res) {
  const { ticketNumber } = req.params;
  let { status } = req.body || {};

  if (!ticketNumber || !status) {
    return res.status(400).json({ success: false, error: 'Ticket number and status are required' });
  }

  status = String(status).toUpperCase().trim();
  if (!['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(status)) {
    return res.status(400).json({ success: false, error: 'Invalid ticket status' });
  }

  try {
    const result = await pool.query(
      `UPDATE support_tickets
       SET status = $1
       WHERE ticket_number = $2
       RETURNING id, ticket_number AS "ticketNumber", status, category, subject, user_id AS "userId"`,
      [status, ticketNumber]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    const ticket = result.rows[0];

    // Audit message in thread
    await pool.query(
      `INSERT INTO support_ticket_messages
       (id, ticket_id, sender_id, sender_name, sender_role, message, created_at)
       VALUES ($1, $2, NULL, 'System', 'SYSTEM', $3, NOW())`,
      [crypto.randomUUID(), ticket.id, `Ticket marked as ${status.toLowerCase()}`]
    ).catch(() => { });

    return res.json({
      success: true,
      message: `Ticket status updated to ${status}`,
      ticket,
    });
  } catch (error) {
    console.error('❌ [Tickets Controller] updateTicketStatus error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update ticket status', details: error.message });
  }
}

/**
 * 4. Send response message from Admin Concierge in ticket thread
 */
export async function sendTicketMessage(req, res) {
  const { ticketNumber } = req.params;
  const { message, senderName = 'Admin Concierge Desk' } = req.body || {};
  const attachment = req.file || null;

  if (!ticketNumber) {
    return res.status(400).json({ success: false, error: 'Ticket number is required' });
  }

  if ((!message || !String(message).trim()) && !attachment) {
    return res.status(400).json({ success: false, error: 'Message text or file attachment is required' });
  }

  try {
    const ticketRes = await pool.query(
      `SELECT id, ticket_number AS "ticketNumber", status, user_id AS "userId"
       FROM support_tickets
       WHERE ticket_number = $1
       LIMIT 1`,
      [ticketNumber]
    );

    if (ticketRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    const ticket = ticketRes.rows[0];
    let attachmentUrl = null;

    // Upload attachment to S3 if present
    if (attachment && attachment.buffer) {
      try {
        const bucketName = process.env.AWS_S3_BUCKET_NAME || 'hackcelestial-profile-pictures';
        const region = process.env.AWS_REGION || 'ap-south-1';
        const originalName = attachment.originalname || 'attachment';
        const ext = originalName.includes('.') ? originalName.slice(originalName.lastIndexOf('.')) : '';
        const cleanBaseName = originalName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
        const key = `support-docs/${ticketNumber}/${Date.now()}-${cleanBaseName}${ext}`;

        const command = new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: attachment.buffer,
          ContentType: attachment.mimetype,
        });

        await s3Client.send(command);
        attachmentUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
      } catch (s3Err) {
        console.warn('⚠️ [S3 Upload Warning]:', s3Err.message);
      }
    }

    const msgId = crypto.randomUUID();

    const insertRes = await pool.query(
      `INSERT INTO support_ticket_messages
       (id, ticket_id, sender_id, sender_name, sender_role, message, attachment_url, attachment_name, attachment_type, attachment_size, created_at)
       VALUES ($1, $2, NULL, $3, 'SUPPORT', $4, $5, $6, $7, $8, NOW())
       RETURNING id, ticket_id AS "ticketId", sender_id AS "senderId", sender_name AS "senderName",
                 sender_role AS "senderRole", message, attachment_url AS "attachmentUrl",
                 attachment_name AS "attachmentName", attachment_type AS "attachmentType",
                 attachment_size AS "attachmentSize", created_at AS "createdAt"`,
      [
        msgId,
        ticket.id,
        String(senderName).trim(),
        message ? String(message).trim() : null,
        attachmentUrl,
        attachment?.originalname || null,
        attachment?.mimetype || null,
        attachment?.size || null,
      ]
    );

    const newMsg = insertRes.rows[0];

    // If ticket was resolved, sending message reopens it to IN_PROGRESS
    if (ticket.status === 'RESOLVED') {
      await pool.query(
        `UPDATE support_tickets SET status = 'IN_PROGRESS' WHERE id = $1`,
        [ticket.id]
      );
      await pool.query(
        `INSERT INTO support_ticket_messages
         (id, ticket_id, sender_id, sender_name, sender_role, message, created_at)
         VALUES ($1, $2, NULL, 'System', 'SYSTEM', 'Ticket reopened as in progress.', NOW())`,
        [crypto.randomUUID(), ticket.id]
      );
    }

    return res.status(201).json({
      success: true,
      message: 'Support message dispatched successfully',
      data: newMsg,
    });
  } catch (error) {
    console.error('❌ [Tickets Controller] sendTicketMessage error:', error);
    return res.status(500).json({ success: false, error: 'Failed to send message', details: error.message });
  }
}
