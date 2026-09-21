import { pool } from '../modules/db.js';

export async function health(_req, res) {
  try { await pool.query('SELECT 1'); res.json({ ok: true }); }
  catch { res.status(503).json({ ok: false }); }
}
