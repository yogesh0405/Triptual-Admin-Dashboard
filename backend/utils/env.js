import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'backend', '.env'), override: false });
dotenv.config({ path: path.resolve(process.cwd(), '..', 'backend', '.env'), override: false });
dotenv.config({ path: path.resolve(process.cwd(), 'Dashboard', '.env'), override: false });

export const env = {
  databaseUrl: process.env.DATABASE_URL ?? '',
  jwtSecret: process.env.JWT_SECRET ?? '',
  port: Number(process.env.PORT ?? 3001),
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5174',
  adminEmail: process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? '',
  adminPassword: process.env.ADMIN_PASSWORD ?? '',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  kafkaBroker: process.env.KAFKA_BROKER || '',
  kafkaUsername: process.env.KAFKA_USERNAME || '',
  kafkaPassword: process.env.KAFKA_PASSWORD || '',
  kafkaTopic: process.env.KAFKA_TOPIC || 'notification-events',
};

export function validateEnv() {
  const missing = [];
  if (!env.databaseUrl) missing.push('DATABASE_URL');
  if (!env.jwtSecret) missing.push('JWT_SECRET');
  if (!env.adminEmail) missing.push('ADMIN_EMAIL');
  if (!env.adminPassword) missing.push('ADMIN_PASSWORD');
  if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}
