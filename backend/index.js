import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { ensureAuthTables, pool } from './modules/db.js';
import { env, validateEnv } from './utils/env.js';
import authRoutes from './routes/auth.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import healthRoutes from './routes/health.routes.js';
import notificationsRoutes from './routes/notifications.routes.js';
import packagesRoutes from './routes/packages.routes.js';
import usersRoutes from './routes/users.routes.js';

const app = express();
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const allowedList = env.frontendUrl.split(',').map((u) => u.trim()).filter(Boolean);
      if (
        allowedList.includes(origin) ||
        /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
      ) {
        return callback(null, true);
      }
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
  await ensureAuthTables();
  await seedAdmin();
  app.listen(env.port, '0.0.0.0', () => console.log(`Admin API listening on port ${env.port}`));
}

start().catch((error) => { console.error(error); process.exit(1); });
