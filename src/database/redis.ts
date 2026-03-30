import { Redis } from 'ioredis';
import { logger } from '@shared/logger.js';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  tls: { rejectUnauthorized: false },
});

redis.on('connect', () => {
  logger.info('Redis conectado');
});

redis.on('error', (err) => {
  logger.error('Erro no Redis:', err);
});

export async function getCache<T>(key: string): Promise<T | null> {
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
}

export async function setCache(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
  await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
}

export async function delCache(key: string): Promise<void> {
  await redis.del(key);
}
