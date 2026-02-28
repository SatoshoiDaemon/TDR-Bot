import { Redis } from 'ioredis';
export declare const redis: Redis;
export declare function getCache<T>(key: string): Promise<T | null>;
export declare function setCache(key: string, value: any, ttlSeconds?: number): Promise<void>;
export declare function delCache(key: string): Promise<void>;
