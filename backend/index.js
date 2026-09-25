import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { ensureAuthTables, ensureSupportMessageSchema, pingDatabase, pool } from './modules/db.js';
import { env, validateEnv } from './utils/env.js';
import authRoutes from './routes/auth.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import healthRoutes from './routes/health.routes.js';
import notificationsRoutes from './routes/notifications.routes.js';
import packagesRoutes from './routes/packages.routes.js';
import ticketsRoutes from './routes/tickets.routes.js';
import usersRoutes from './routes/users.routes.js';

const app = express();
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // Allow server-to-server / curl
      const allowedList = env.frontendUrl.split(',').map((u) => u.trim()).filter(Boolean);
      const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
      const isVercel = /^https:\/\/[a-zA-Z0-9-]+\.vercel\.app$/.test(origin);
      if (allowedList.includes(origin) || isLocalhost || isVercel) {
        return callback(null, true);
      }
      console.warn(`[CORS] Blocked origin: ${origin}`);
      return callback(new Error('CORS origin not allowed'));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/packages', packagesRoutes);
app.use('/api/tickets', ticketsRoutes);

app.use((error, _req, res, _next) => {
  console.error('[Express] Unhandled API error:', error);
  if (res.headersSent) {
    return;
  }
  res.status(500).json({ error: 'Internal server error' });
});

async function seedAdmin() {
  const hash = await bcrypt.hash(env.adminPassword, 12);
  const emails = Array.from(new Set([env.adminEmail, 'admin@triptual', 'admin@triptual.com']));
  for (const email of emails) {
    const existing = await pool.query('SELECT 1 FROM triptual_admin_users WHERE email = $1', [email]);
    if (!existing.rowCount) {
      await pool.query('INSERT INTO triptual_admin_users (email, password_hash) VALUES ($1, $2)', [email, hash]);
    }
  }
}

async function start() {
  validateEnv();
  await pingDatabase();
  await ensureAuthTables();
  await ensureSupportMessageSchema();
  await seedAdmin();
  app.listen(env.port, '0.0.0.0', () => console.log(`Admin API listening on port ${env.port}`));
}

start().catch((error) => { console.error(error); process.exit(1); });
