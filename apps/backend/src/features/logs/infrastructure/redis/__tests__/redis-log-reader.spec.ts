import { firstValueFrom, Observable, Subscription, toArray } from 'rxjs';

import { LogEntry } from '../../../domain/models/log-entry.models';
import { LogEvent } from '../../../domain/models/log-event.models';
import type { LogsRepository } from '../../../domain/repositories/logs.repository';
import { readLogStream } from '../redis-log-reader';

import type { AppLogger } from '@core/domain/ports/app-logger.port';
import { RedisConnection } from '@core/infrastructure/redis/redis.connection';

import { FakeRedis, FakeRedisConnection } from '../../../../../../test/fakes/fake-redis';

/** Builds an archived log entry fixture, overriding only the fields under test. */
const logEntry = (overrides: Partial<LogEntry> = {}): LogEntry => ({
    id: 'entry-1',
    deploymentId: 'deployment-1',
    seq: 1,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    type: 'line',
    data: 'first',
    ...overrides,
} as LogEntry);

/** Resolves after a delay, letting the polling reader run a few rounds. */
const wait = (ms: number): Promise<void> =>
    new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
    });

describe('readLogStream', () => {
    const key = 'logs:deployment-1';
    const leaseKey = 'logs:deployment-1:producer';

    let client: FakeRedis;
    let connection: FakeRedisConnection;
    let mockRepository: jest.Mocked<Pick<LogsRepository, 'getAllByDeployment'>>;
    let mockLogger: jest.Mocked<Pick<AppLogger, 'error'>>;
    let subscription: Subscription | undefined;

    /** Wraps the reader in the cold observable the adapter builds around it. */
    const streamOf = (streamId = 'deployment-1'): Observable<LogEvent> => new Observable<LogEvent>((subscriber) => {
        let cancelled = false;

        void readLogStream(
            connection as unknown as RedisConnection,
            mockRepository as unknown as LogsRepository,
            mockLogger as unknown as AppLogger,
            streamId,
            subscriber,
            () => cancelled,
        );

        return () => { cancelled = true; };
    });

    beforeEach(() => {
        jest.clearAllMocks();

        client = new FakeRedis();
        connection = new FakeRedisConnection(client);
        mockRepository = { getAllByDeployment: jest.fn().mockResolvedValue([]) };
        mockLogger = { error: jest.fn() };
        subscription = undefined;
    });

    afterEach(() => {
        subscription?.unsubscribe();
    });

    it('replays the archived log and completes when Redis no longer holds the stream', async () => {
        mockRepository.getAllByDeployment.mockResolvedValue([
            logEntry(),
            logEntry({ id: 'entry-2', seq: 2, type: 'end', status: 'success' }),
        ]);

        const received = await firstValueFrom(streamOf().pipe(toArray()));

        expect(mockRepository.getAllByDeployment).toHaveBeenCalledWith('deployment-1');
        expect(received).toEqual([{ type: 'line', data: 'first' }, { type: 'end', status: 'success' }]);
    });

    it('reads the history first and completes on the terminal entry', async () => {
        await client.xadd(key, '*', 'type', 'line', 'content', 'first');
        await client.xadd(key, '*', 'type', 'end', 'status', 'failed');

        const received = await firstValueFrom(streamOf().pipe(toArray()));

        expect(received).toEqual([{ type: 'line', data: 'first' }, { type: 'end', status: 'failed' }]);
        expect(mockRepository.getAllByDeployment).not.toHaveBeenCalled();
    });

    it('delivers the entries appended after the subscriber joined, with no duplicate', async () => {
        await client.xadd(key, '*', 'type', 'line', 'content', 'first');
        await client.set(leaseKey, '1');

        const received: LogEvent[] = [];
        const completed = new Promise<void>((resolve) => {
            subscription = streamOf().subscribe({
                next: (event) => { received.push(event); },
                complete: () => { resolve(); },
            });
        });

        await wait(10);
        await client.xadd(key, '*', 'type', 'line', 'content', 'second');
        await client.xadd(key, '*', 'type', 'end', 'status', 'success');
        await completed;

        expect(received).toEqual([
            { type: 'line', data: 'first' },
            { type: 'line', data: 'second' },
            { type: 'end', status: 'success' },
        ]);
    });

    it('completes a stream whose producer dropped its lease without writing its terminal entry', async () => {
        await client.xadd(key, '*', 'type', 'line', 'content', 'first');

        const received = await firstValueFrom(streamOf().pipe(toArray()));

        expect(received).toEqual([{ type: 'line', data: 'first' }]);
    });

    it('keeps waiting while the producer still holds its lease', async () => {
        await client.xadd(key, '*', 'type', 'line', 'content', 'first');
        await client.set(leaseKey, '1');

        const received: LogEvent[] = [];
        let completed = false;

        subscription = streamOf().subscribe({
            next: (event) => { received.push(event); },
            complete: () => { completed = true; },
        });

        await wait(20);

        expect(completed).toBe(false);
        expect(received).toEqual([{ type: 'line', data: 'first' }]);
    });

    it('closes the stream as soon as the producer lets its lease go', async () => {
        await client.xadd(key, '*', 'type', 'line', 'content', 'first');
        await client.set(leaseKey, '1');

        let completed = false;

        subscription = streamOf().subscribe({ complete: () => { completed = true; } });

        await wait(20);

        expect(completed).toBe(false);

        await client.del(leaseKey);
        await wait(20);

        expect(completed).toBe(true);
    });

    it('reads on the blocking connection per read round and stops reading once unsubscribed', async () => {
        await client.xadd(key, '*', 'type', 'line', 'content', 'first');
        await client.set(leaseKey, '1');

        subscription = streamOf().subscribe();

        await wait(20);

        const reads = client.reads;

        expect(reads).toBeGreaterThan(0);

        subscription.unsubscribe();

        await wait(20);

        expect(connection.blockingCalls).toBe(reads);
        expect(client.reads).toBeLessThanOrEqual(reads + 1);
    });

    it('never leaves the reader polling after the producer lease expired with no terminal entry', async () => {
        await client.xadd(key, '*', 'type', 'line', 'content', 'first');

        let completed = false;

        subscription = streamOf().subscribe({ complete: () => { completed = true; } });

        await wait(30);

        const reads = client.reads;

        await wait(30);

        expect(completed).toBe(true);
        expect(client.reads).toBe(reads);
    });

    it('reports a Redis failure to the subscriber and to the logger', async () => {
        const error = new Error('redis down');

        client.failure = error;

        await expect(firstValueFrom(streamOf().pipe(toArray()))).rejects.toBe(error);
        expect(mockLogger.error).toHaveBeenCalledWith(
            'Failed to stream the log of deployment deployment-1: redis down',
            error,
            'RedisLogStoreAdapter',
        );
    });
});
