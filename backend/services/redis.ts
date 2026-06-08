import Redis from 'ioredis';
import logger from './logger';

const REDIS_URL = process.env.REDIS_URL || '';
const TTL_DEFAULT = 60;

let client: Redis | null = null;
let enabled = false;

if (REDIS_URL) {
  client = new Redis(REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 3) return null;
      return Math.min(times * 200, 2000);
    },
    enableOfflineQueue: false,
  });

  client.on('error', (err) => {
    logger.warn('Redis connection error (falling back to memory cache)', { error: err.message });
  });

  client.connect().then(() => {
    enabled = true;
    logger.info('Redis connected');
  }).catch(() => {
    logger.warn('Redis unavailable — using memory cache');
    client = null;
  });
} else {
  logger.info('REDIS_URL not set — using memory cache');
}

export function getCacheKey(key: string): string {
  return `velsoie:${key}`;
}

export async function cacheGet(key: string): Promise<any | null> {
  if (!enabled || !client) return null;
  try {
    const val = await client.get(getCacheKey(key));
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: any, ttlSeconds: number = TTL_DEFAULT): Promise<void> {
  if (!enabled || !client) return;
  try {
    await client.setex(getCacheKey(key), ttlSeconds, JSON.stringify(value));
  } catch { /* ignore */ }
}

export async function cacheDel(pattern: string): Promise<void> {
  if (!enabled || !client) return;
  try {
    const keys = await client.keys(getCacheKey(pattern));
    if (keys.length > 0) await client.del(...keys);
  } catch { /* ignore */ }
}

export async function cacheFlush(): Promise<void> {
  if (!enabled || !client) return;
  try {
    const keys = await client.keys('velsoie:*');
    if (keys.length > 0) await client.del(...keys);
  } catch { /* ignore */ }
}

export function isRedisEnabled(): boolean {
  return enabled;
}

export async function closeRedis(): Promise<void> {
  if (client) {
    try { await client.quit(); } catch { /* ignore */ }
  }
}
