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
  adminEmail: (process.env.ADMIN_EMAIL).toLowerCase(),
  adminPassword: process.env.ADMIN_PASSWORD,
  nodeEnv: process.env.NODE_ENV ?? 'development',
  kafkaBroker: process.env.KAFKA_BROKER || '',
  kafkaUsername: process.env.KAFKA_USERNAME || '',
  kafkaPassword: process.env.KAFKA_PASSWORD || '',
  kafkaTopic: process.env.KAFKA_TOPIC || 'notification-events',
};

export function validateEnv() {
  if (!env.databaseUrl || !env.jwtSecret) throw new Error('DATABASE_URL and JWT_SECRET are required');
}
