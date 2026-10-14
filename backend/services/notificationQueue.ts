import { Queue, Job } from 'bullmq';
import IORedis from 'ioredis';
import logger from './logger';

const redisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

const connection = new IORedis(redisConfig);

const notificationQueue = new Queue('notifications', { connection });

export type NotificationType = 'email' | 'sms' | 'whatsapp' | 'push';

export interface NotificationData {
  type: NotificationType;
  to: string;
  subject?: string;
  html?: string;
  text?: string;
  body?: string;
  tenantId?: number;
  smtpEmail?: string;
  smtpPass?: string;
  priority?: 'high' | 'normal' | 'low';
  retryChain?: NotificationType[];
  data?: Record<string, unknown>;
}

const PRIORITY_MAP: Record<string, number> = {
  high: 10,
  normal: 1,
  low: -5,
};

export async function enqueueNotification(data: NotificationData, opts?: { priority?: number; delay?: number }) {
  try {
    const priority = opts?.priority ?? PRIORITY_MAP[data.priority || 'normal'] ?? 1;
    const job = await notificationQueue.add(
      'send',
      data,
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        priority,
        delay: opts?.delay,
        removeOnComplete: { age: 3600 },
        removeOnFail: { age: 86400 },
      }
    );
    logger.info('🔔 Notificación encolada', {
      type: data.type,
      to: data.to,
      jobId: job.id,
    });
    return job;
  } catch (err) {
    logger.error('Error encolando notificación:', err);
  }
}

export async function enqueueWithRetry(data: NotificationData) {
  if (!data.retryChain || data.retryChain.length === 0) {
    return enqueueNotification(data);
  }
  const nextType = data.retryChain[0];
  const remainingChain = data.retryChain.slice(1);
  const originalType = data.type;

  const fallbackData: NotificationData = {
    ...data,
    type: nextType,
    retryChain: remainingChain,
  };

  // Enqueue the fallback chain after the primary fails
  await enqueueNotification(fallbackData).catch(() => {});

  return enqueueNotification({ ...data, type: originalType });
}

export { notificationQueue, connection };
export default connection;
