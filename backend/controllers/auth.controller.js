import bcrypt from 'bcryptjs';
import { pool } from '../modules/db.js';
import { createRefreshToken, hashToken, refreshCookie, refreshTtlMs, signAccessToken } from '../modules/auth.js';

export async function login(req, res) {
  try {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const result = await pool.query('SELECT id, email, password_hash FROM triptual_admin_users WHERE email = $1', [email]);
    if (!result.rowCount || !(await bcrypt.compare(password, result.rows[0].password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const admin = { id: result.rows[0].id, email: result.rows[0].email };
    const refresh = createRefreshToken();
    await pool.query('INSERT INTO triptual_admin_sessions (admin_id, refresh_token_hash, expires_at) VALUES ($1, $2, $3)', [admin.id, hashToken(refresh), new Date(Date.now() + refreshTtlMs)]);
    return res.cookie('triptual_refresh', refresh, refreshCookie).json({ accessToken: signAccessToken(admin), admin });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: err.message || 'Server error during login' });
  }
}

export async function refresh(req, res) {
  try {
    const token = req.cookies.triptual_refresh;
    if (!token) return res.status(401).json({ error: 'Refresh token missing' });
    const result = await pool.query('SELECT a.id, a.email FROM triptual_admin_sessions s JOIN triptual_admin_users a ON a.id = s.admin_id WHERE s.refresh_token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > now()', [hashToken(token)]);
    if (!result.rowCount) return res.status(401).json({ error: 'Refresh token expired or revoked' });
    return res.json({ accessToken: signAccessToken(result.rows[0]), admin: result.rows[0] });
  } catch (err) {
    console.error('Refresh error:', err);
    return res.status(500).json({ error: err.message || 'Server error during token refresh' });
  }
}

export async function logout(req, res) {
  try {
    const token = req.cookies.triptual_refresh;
    if (token) await pool.query('UPDATE triptual_admin_sessions SET revoked_at = now() WHERE refresh_token_hash = $1', [hashToken(token)]);
    return res.clearCookie('triptual_refresh', refreshCookie).status(204).end();
  } catch (err) {
    console.error('Logout error:', err);
    return res.clearCookie('triptual_refresh', refreshCookie).status(204).end();
  }
}
