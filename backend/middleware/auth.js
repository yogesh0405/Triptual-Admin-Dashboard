import jwt from 'jsonwebtoken';
import { env } from '../utils/env.js';

export function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    if (payload.type !== 'access') throw new Error('Wrong token type');
    req.admin = { id: payload.sub, email: payload.email };
    next();
  } catch {
    return res.status(401).json({ error: 'Access token expired or invalid' });
  }
}
