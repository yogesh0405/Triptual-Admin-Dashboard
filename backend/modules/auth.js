import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../utils/env.js';

export const refreshTtlMs = 30 * 24 * 60 * 60 * 1000;
export const refreshCookie = { httpOnly: true, sameSite: 'lax', secure: env.nodeEnv === 'production', maxAge: refreshTtlMs };
export const hashToken = (value) => crypto.createHash('sha256').update(value).digest('hex');
export const createRefreshToken = () => crypto.randomBytes(48).toString('hex');
export const signAccessToken = (admin) => jwt.sign({ sub: admin.id, email: admin.email, type: 'access' }, env.jwtSecret, { expiresIn: '15m' });
