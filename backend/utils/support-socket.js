import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import { env } from './env.js';
import { pool } from '../modules/db.js';

const EVENT_CHANNEL = 'triptual_support_events';
const ticketRoom = (ticketNumber) => `ticket:${String(ticketNumber).trim()}`;
let eventClient = null;
let connecting = false;
let retryTimer = null;
let pollTimer = null;
let dispatching = false;
const consumerName = `support-admin:${process.env.RENDER_INSTANCE_ID || process.env.HOSTNAME || 'local'}`;

async function dispatchDatabaseEvent(io, payload) {
  if (!payload?.type) return;
  const ticketNumber = String(payload.ticketNumber || '').trim();
  if (payload.type === 'ticket:created') {
    io.to('support:admins').emit('ticket:created', { ticketNumber });
    return;
  }
  if (!ticketNumber) return;

  if (payload.type === 'ticket:message' && payload.messageId) {
    const result = await pool.query(
      `SELECT m.id, m.ticket_id AS "ticketId", m.sender_id AS "senderId", m.sender_name AS "senderName",
              m.sender_role AS "senderRole", m.message, m.attachment_url AS "attachmentUrl",
              m.attachment_name AS "attachmentName", m.attachment_type AS "attachmentType",
              m.attachment_size AS "attachmentSize", m.created_at AS "createdAt"
       FROM support_ticket_messages m
       JOIN support_tickets t ON t.id = m.ticket_id
       WHERE t.ticket_number = $1 AND m.id = $2
       LIMIT 1`,
      [ticketNumber, payload.messageId]
    );
    if (result.rowCount) {
      io.to(ticketRoom(ticketNumber)).emit('ticket:message', {
        ticketNumber,
        message: result.rows[0],
      });
    }
    return;
  }

  if (payload.type === 'ticket:status_change') {
    io.to(ticketRoom(ticketNumber)).emit('ticket:status_change', {
      ticketNumber,
      status: payload.status,
    });
    return;
  }

  if (payload.type === 'ticket:typing') {
    io.to(ticketRoom(ticketNumber)).emit('ticket:typing', {
      ticketNumber,
      isTyping: Boolean(payload.isTyping),
      senderRole: payload.senderRole,
    });
  }
}

function scheduleReconnect(io) {
  if (retryTimer) return;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    connectEventListener(io);
  }, 3000);
  retryTimer.unref?.();
}

async function dispatchPendingEvents(io) {
  if (dispatching) return;
  dispatching = true;
  let client;
  try {
    client = await pool.connect();
    await client.query(
      `INSERT INTO support_ticket_event_consumers (consumer_name, last_event_id)
       SELECT $1, COALESCE(MAX(event_id), 0) FROM support_ticket_event_outbox
       ON CONFLICT (consumer_name) DO NOTHING`,
      [consumerName]
    );
    while (true) {
      await client.query('BEGIN');
      const cursor = await client.query(
        'SELECT last_event_id FROM support_ticket_event_consumers WHERE consumer_name = $1 FOR UPDATE',
        [consumerName]
      );
      const events = await client.query(
        `SELECT event_id AS "eventId", event_type AS type, ticket_number AS "ticketNumber", payload
         FROM support_ticket_event_outbox WHERE event_id > $1 ORDER BY event_id ASC LIMIT 100`,
        [cursor.rows[0].last_event_id]
      );
      for (const event of events.rows) {
        await dispatchDatabaseEvent(io, { ...event.payload, type: event.type, ticketNumber: event.ticketNumber });
      }
      if (events.rowCount) {
        await client.query(
          'UPDATE support_ticket_event_consumers SET last_event_id = $1, updated_at = NOW() WHERE consumer_name = $2',
          [events.rows[events.rowCount - 1].eventId, consumerName]
        );
      }
      await client.query('COMMIT');
      if (events.rowCount < 100) break;
    }
  } catch (error) {
    await client?.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client?.release();
    dispatching = false;
  }
}

function schedulePoll(io, immediate = false) {
  if (pollTimer) {
    if (!immediate) return;
    clearTimeout(pollTimer);
    pollTimer = null;
  }
  pollTimer = setTimeout(async () => {
    pollTimer = null;
    try {
      await dispatchPendingEvents(io);
    } catch (error) {
      console.error('[Support Socket] Outbox delivery failed:', error.message);
    }
    schedulePoll(io);
  }, immediate ? 0 : 30000);
  pollTimer.unref?.();
}

async function connectEventListener(io) {
  if (eventClient || connecting) return;
  connecting = true;
  let client;
  let released = false;
  const releaseAndRetry = (error) => {
    if (released) return;
    released = true;
    if (eventClient === client) eventClient = null;
    client?.release(error);
    scheduleReconnect(io);
  };

  try {
    client = await pool.connect();
    await client.query(`LISTEN ${EVENT_CHANNEL}`);
    eventClient = client;
    console.info('[Support Socket] Listening for committed support events');
    schedulePoll(io, true);
    client.on('notification', (notification) => {
      if (notification.channel !== EVENT_CHANNEL || !notification.payload) return;
      try {
        const ephemeralEvent = JSON.parse(notification.payload);
        if (ephemeralEvent.type === 'ticket:typing') {
          io.to(ticketRoom(ephemeralEvent.ticketNumber)).emit('ticket:typing', ephemeralEvent);
          return;
        }
      } catch {
        // Durable outbox wake notifications carry an integer event ID.
      }
      schedulePoll(io, true);
    });
    client.on('error', (error) => {
      console.error('[Support Socket] Database event listener failed:', error.message);
      releaseAndRetry(error);
    });
    client.on('end', () => releaseAndRetry());
  } catch (error) {
    console.error('[Support Socket] Could not start database event listener:', error.message);
    releaseAndRetry(error);
  } finally {
    connecting = false;
  }
}

export function initSupportSocket(httpServer) {
  const allowedOrigins = env.frontendUrl.split(',').map((origin) => origin.trim()).filter(Boolean);
  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin || '');
        const isVercel = /^https:\/\/[a-zA-Z0-9-]+\.vercel\.app$/.test(origin || '');
        callback(null, !origin || allowedOrigins.includes(origin) || isLocalhost || isVercel);
      },
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');
      if (!token) return next(new Error('unauthorized'));
      const decoded = jwt.verify(token, env.jwtSecret);
      if (decoded.type !== 'access' || !decoded.sub) return next(new Error('unauthorized'));
      const admin = await pool.query(
        'SELECT id FROM triptual_admin_users WHERE id = $1 LIMIT 1',
        [decoded.sub]
      );
      if (!admin.rowCount) return next(new Error('unauthorized'));
      socket.data.adminId = String(admin.rows[0].id);
      socket.data.actorRole = 'SUPPORT';
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.join('support:admins');

    socket.on('join:ticket', async (ticketNumber, ack) => {
      const cleanTicketNumber = String(ticketNumber || '').trim();
      try {
        const ticket = await pool.query(
          'SELECT 1 FROM support_tickets WHERE ticket_number = $1 LIMIT 1',
          [cleanTicketNumber]
        );
        if (!cleanTicketNumber || !ticket.rowCount) {
          if (typeof ack === 'function') ack({ ok: false, error: 'ticket_not_found' });
          return;
        }
        await socket.join(ticketRoom(cleanTicketNumber));
        if (typeof ack === 'function') ack({ ok: true, ticketNumber: cleanTicketNumber });
      } catch (error) {
        console.error('[Support Socket] Ticket join failed:', error.message);
        if (typeof ack === 'function') ack({ ok: false, error: 'join_failed' });
      }
    });

    socket.on('leave:ticket', (ticketNumber) => {
      const cleanTicketNumber = String(ticketNumber || '').trim();
      if (cleanTicketNumber) socket.leave(ticketRoom(cleanTicketNumber));
    });

    socket.on('ticket:typing', async (payload) => {
      const cleanTicketNumber = String(payload?.ticketNumber || '').trim();
      if (!cleanTicketNumber || !socket.rooms.has(ticketRoom(cleanTicketNumber))) return;
      if (payload.isTyping && Date.now() - (socket.data.lastTypingAt || 0) < 400) return;
      socket.data.lastTypingAt = Date.now();
      try {
        await pool.query(
          'SELECT pg_notify($1, $2)',
          [EVENT_CHANNEL, JSON.stringify({
            type: 'ticket:typing',
            ticketNumber: cleanTicketNumber,
            isTyping: Boolean(payload.isTyping),
            senderRole: 'SUPPORT',
          })]
        );
      } catch (error) {
        console.warn('[Support Socket] Typing update was not published:', error.message);
      }
    });

    socket.on('disconnect', (reason) => {
      console.info(`[Support Socket] Admin ${socket.data.adminId} disconnected: ${reason}`);
    });
  });

  connectEventListener(io);
  return io;
}