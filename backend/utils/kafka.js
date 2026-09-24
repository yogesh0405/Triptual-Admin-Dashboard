import { Kafka } from 'kafkajs';
import crypto from 'node:crypto';
import { env } from './env.js';

let producer = null;
let isConnecting = false;

async function getProducer() {
  if (producer) return producer;
  if (!env.kafkaBroker) return null;

  try {
    const kafkaConfig = {
      clientId: 'admin-dashboard-backend',
      brokers: [env.kafkaBroker],
      ssl: { rejectUnauthorized: false },
    };

    if (env.kafkaUsername && env.kafkaPassword) {
      kafkaConfig.sasl = {
        mechanism: 'scram-sha-256',
        username: env.kafkaUsername,
        password: env.kafkaPassword,
      };
    }

    const kafka = new Kafka(kafkaConfig);
    const p = kafka.producer();

    if (!isConnecting) {
      isConnecting = true;
      await p.connect();
      producer = p;
      isConnecting = false;
      console.log('✅ [Kafka Producer] Connected to Aiven Kafka broker successfully.');
    }

    return producer;
  } catch (error) {
    isConnecting = false;
    console.error('❌ [Kafka Producer] Connection failed:', error.message);
    return null;
  }
}

/**
 * Publish a notification event to Kafka topic
 */
export async function publishNotificationEvent(eventType = 'SYSTEM_ALERT', payload = {}) {
  const eventId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  const eventMessage = {
    eventId,
    eventType,
    timestamp,
    payload: {
      userId: payload.userId || null,
      title: payload.title || '',
      body: payload.body || '',
      channels: payload.channels || [],
      targetAudience: payload.targetAudience || 'all',
      actionUrl: payload.actionUrl || '',
      category: payload.category || 'general',
      data: payload.data || { source: 'ADMIN_DASHBOARD' },
    },
  };

  try {
    const p = await getProducer();
    if (!p) {
      console.warn('⚠️ [Kafka Producer] Kafka producer unavailable. Event skipped.');
      return { success: false, eventId, message: 'Kafka producer unavailable' };
    }

    await p.send({
      topic: env.kafkaTopic,
      messages: [
        {
          key: payload.userId || 'BROADCAST',
          value: JSON.stringify(eventMessage),
        },
      ],
    });

    console.log(`🚀 [Kafka Producer] Event [${eventId}] pushed to topic "${env.kafkaTopic}"`);
    return { success: true, eventId };
  } catch (error) {
    console.error(`❌ [Kafka Producer] Error pushing event [${eventId}]:`, error.message);
    return { success: false, eventId, error: error.message };
  }
}
