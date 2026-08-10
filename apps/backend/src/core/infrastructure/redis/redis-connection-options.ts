import type { RedisOptions } from 'ioredis';

/**
 * Builds the Redis connection options used by the NestJS runtime
 *
 * @returns The fully resolved `ioredis` connection options
 */
export function buildRedisConnectionOptions(): RedisOptions {
    const password = process.env.REDIS_PASSWORD;

    return {
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT),
        ...(password ? { password } : {}),
    };
}
