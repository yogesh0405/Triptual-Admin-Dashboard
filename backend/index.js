import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { ensureAuthTables, pool } from './modules/db.js';
import { env, validateEnv } from './utils/env.js';
import authRoutes from './routes/auth.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import healthRoutes from './routes/health.routes.js';
import usersRoutes from './routes/users.routes.js';

const app = express();
app.use(cors({ origin: env.frontendUrl, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', usersRoutes);

async function seedAdmin() {
  const existing = await pool.query('SELECT 1 FROM triptual_admin_users WHERE email = $1', [env.adminEmail]);
  if (!existing.rowCount) await pool.query('INSERT INTO triptual_admin_users (email, password_hash) VALUES ($1, $2)', [env.adminEmail, await bcrypt.hash(env.adminPassword, 12)]);
}

async function start() {
  validateEnv();
  await ensureAuthTables();
  await seedAdmin();
  app.listen(env.port, '0.0.0.0', () => console.log(`Admin API listening on port ${env.port}`));
}

start().catch((error) => { console.error(error); process.exit(1); });
