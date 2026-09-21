import { Pool } from 'pg';
import { env } from '../utils/env.js';

export const pool = new Pool({
  connectionString: env.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  ssl: env.databaseUrl.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
});

export const quoteIdentifier = (value) => `"${value.replace(/"/g, '""')}"`;

export async function tableColumns(candidates) {
  const result = await pool.query(`SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND lower(table_name) = ANY($1::text[])`, [candidates.map((name) => name.toLowerCase())]);
  const found = new Map();
  for (const row of result.rows) {
    const key = row.table_name.toLowerCase();
    if (!found.has(key)) found.set(key, new Set());
    found.get(key).add(row.column_name.toLowerCase());
  }
  return found;
}

export const firstColumn = (columns, names) => names.find((name) => columns.has(name));

export async function ensureAuthTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS triptual_admin_users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS triptual_admin_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      admin_id UUID NOT NULL REFERENCES triptual_admin_users(id) ON DELETE CASCADE,
      refresh_token_hash TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL,
      revoked_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS triptual_admin_sessions_token_idx ON triptual_admin_sessions(refresh_token_hash);
  `);
}
