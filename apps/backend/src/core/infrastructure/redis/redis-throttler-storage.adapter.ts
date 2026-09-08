import { Inject, Injectable } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';

import { RedisConnection } from './redis.connection';

/**
 * Record the guard of the limit reads back from its storage.
 */
type ThrottlerStorageRecord = Awaited<ReturnType<ThrottlerStorage['increment']>>;

/**
 * Prefix every key of the limit carries, so a flush of the counters spares the other keys.
 */
const KEY_PREFIX = 'throttle';

/**
 * Number of milliseconds one second holds.
 */
const MILLISECONDS_PER_SECOND = 1000;

/**
 * Script that counts one hit and reads its block back in one round trip.
 *
 * Redis runs it atomically, so two instances of the backend never lose a hit against each other.
 * `KEYS[1]` counts the hits, `KEYS[2]` marks the block, and the reply holds the hits, the life of
 * the window in milliseconds, the block as a flag, and the life of that block.
 */
const INCREMENT_SCRIPT = `
local hitsKey = KEYS[1]
local blockKey = KEYS[2]
local ttl = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local blockDuration = tonumber(ARGV[3])

local blockTtl = redis.call('PTTL', blockKey)

if blockTtl > 0 then
    return { tonumber(redis.call('GET', hitsKey)) or 0, blockTtl, 1, blockTtl }
end

local hits = redis.call('INCR', hitsKey)
local hitsTtl = redis.call('PTTL', hitsKey)

if hitsTtl <= 0 then
    redis.call('PEXPIRE', hitsKey, ttl)
    hitsTtl = ttl
end

if hits > limit then
    redis.call('SET', blockKey, 1, 'PX', blockDuration)

    return { hits, hitsTtl, 1, blockDuration }
end

return { hits, hitsTtl, 0, 0 }
`;

/**
 * Turns a life in milliseconds into the seconds the guard publishes in its headers.
 *
 * @param milliseconds Life of a key
 *
 * @returns The same life, rounded up to the second
 */
function toSeconds(milliseconds: number): number {
    return Math.ceil(milliseconds / MILLISECONDS_PER_SECOND);
}

/**
 * Storage of the counters of the rate limit, held in Redis.
 */
@Injectable()
export class RedisThrottlerStorageAdapter implements ThrottlerStorage {
    constructor(@Inject(RedisConnection) private readonly connection: RedisConnection) {}

    public async increment(
        key: string,
        ttl: number,
        limit: number,
        blockDuration: number,
        throttlerName: string,
    ): Promise<ThrottlerStorageRecord> {
        const hitsKey = `${KEY_PREFIX}:${throttlerName}:${key}`;

        const [totalHits, timeToExpire, blocked, timeToBlockExpire] = await this.connection
            .getClient()
            .eval(
                INCREMENT_SCRIPT,
                2,
                hitsKey,
                `${hitsKey}:block`,
                String(ttl),
                String(limit),
                String(blockDuration),
            ) as [number, number, number, number];

        return {
            totalHits,
            timeToExpire: toSeconds(timeToExpire),
            isBlocked: blocked === 1,
            timeToBlockExpire: toSeconds(timeToBlockExpire),
        };
    }
}
