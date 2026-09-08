import type { Redis } from 'ioredis';

import { RedisThrottlerStorageAdapter } from '../redis-throttler-storage.adapter';
import type { RedisConnection } from '../redis.connection';

/** Reply of the script: hits, life of the window, block, life of the block. */
type ScriptReply = [number, number, number, number];

describe('RedisThrottlerStorageAdapter', () => {
    let mockClient: jest.Mocked<Pick<Redis, 'eval'>>;
    let mockConnection: jest.Mocked<Pick<RedisConnection, 'getClient'>>;
    let sut: RedisThrottlerStorageAdapter;

    /** Arms the reply the script gives back. */
    const replyWith = (reply: ScriptReply): void => {
        mockClient.eval.mockResolvedValue(reply);
    };

    beforeEach(() => {
        jest.clearAllMocks();

        mockClient = { eval: jest.fn() };
        mockConnection = { getClient: jest.fn(() => mockClient as unknown as Redis) };
        sut = new RedisThrottlerStorageAdapter(mockConnection as unknown as RedisConnection);
    });

    it('counts the hit on the shared connection of Redis', async () => {
        replyWith([1, 60_000, 0, 0]);

        await sut.increment('key', 60_000, 10, 60_000, 'default');

        expect(mockConnection.getClient).toHaveBeenCalledTimes(1);
        expect(mockClient.eval).toHaveBeenCalledTimes(1);
    });

    it('names the key of the hits and the key of the block after the limit that counts', async () => {
        replyWith([1, 60_000, 0, 0]);

        await sut.increment('abc', 60_000, 10, 30_000, 'default');

        const [script, keyCount, hitsKey, blockKey, ttl, limit, blockDuration] = mockClient.eval.mock.calls[0];

        expect(typeof script).toBe('string');
        expect(keyCount).toBe(2);
        expect(hitsKey).toBe('throttle:default:abc');
        expect(blockKey).toBe('throttle:default:abc:block');
        expect(ttl).toBe('60000');
        expect(limit).toBe('10');
        expect(blockDuration).toBe('30000');
    });

    it('keeps the counters of two limits apart, since the name joins the key', async () => {
        replyWith([1, 60_000, 0, 0]);

        await sut.increment('abc', 60_000, 10, 60_000, 'stream');

        expect(mockClient.eval.mock.calls[0][2]).toBe('throttle:stream:abc');
    });

    it('counts one hit in a window that stays open', async () => {
        replyWith([3, 45_000, 0, 0]);

        const record = await sut.increment('key', 60_000, 10, 60_000, 'default');

        expect(record).toEqual({
            totalHits: 3,
            timeToExpire: 45,
            isBlocked: false,
            timeToBlockExpire: 0,
        });
    });

    it('reports the block once the hits cross the limit', async () => {
        replyWith([11, 40_000, 1, 30_000]);

        const record = await sut.increment('key', 60_000, 10, 30_000, 'default');

        expect(record.isBlocked).toBe(true);
        expect(record.totalHits).toBe(11);
        expect(record.timeToBlockExpire).toBe(30);
    });

    it('rounds the life of a window up to the next second', async () => {
        replyWith([1, 1200, 0, 0]);

        const record = await sut.increment('key', 60_000, 10, 60_000, 'default');

        expect(record.timeToExpire).toBe(2);
    });

    it('rounds the life of a block up to the next second', async () => {
        replyWith([11, 1200, 1, 1500]);

        const record = await sut.increment('key', 60_000, 10, 60_000, 'default');

        expect(record.timeToBlockExpire).toBe(2);
    });

    it('propagates a failure of Redis, so no client escapes the limit unseen', async () => {
        const boom = new Error('redis is down');
        mockClient.eval.mockRejectedValue(boom);

        await expect(sut.increment('key', 60_000, 10, 60_000, 'default')).rejects.toBe(boom);
    });
});
