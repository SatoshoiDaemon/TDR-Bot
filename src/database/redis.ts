import { Redis } from 'ioredis';
import { logger } from '@shared/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Configuração TLS para SquareCloud
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const certsDir = path.resolve(__dirname, '../../certs/redis');

// Verificar se os certificados existem
const hasCerts = fs.existsSync(path.join(certsDir, 'ca-certificate.crt'));

const tlsOptions = hasCerts ? {
  tls: {
    ca: fs.readFileSync(path.join(certsDir, 'ca-certificate.crt')),
    cert: fs.readFileSync(path.join(certsDir, 'certificate.pem')),
    key: fs.readFileSync(path.join(certsDir, 'private-key.key')),
    rejectUnauthorized: true,
  },
} : {};

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  ...tlsOptions,
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
