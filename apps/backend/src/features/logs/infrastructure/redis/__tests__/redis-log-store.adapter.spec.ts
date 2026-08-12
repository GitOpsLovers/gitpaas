import { ConfigService } from '@nestjs/config';
import { firstValueFrom, toArray } from 'rxjs';

import { FakeRedis, FakeRedisConnection } from '../../../../../../test/fakes/fake-redis';
import { LogEvent } from '../../../domain/models/log-event.models';
import type { LogsRepository } from '../../../domain/repositories/logs.repository';
import { RedisLogStoreAdapter } from '../redis-log-store.adapter';

import { NestLoggerAdapter } from '@core/infrastructure/logging/nest-logger.adapter';
import { RedisConnection } from '@core/infrastructure/redis/redis.connection';

describe('RedisLogStoreAdapter', () => {
    const key = 'logs:deployment-1';
    const leaseKey = 'logs:deployment-1:producer';

    let client: FakeRedis;
    let connection: FakeRedisConnection;
    let mockRepository: jest.Mocked<
        Pick<LogsRepository, 'createMany' | 'getAllByDeployment' | 'deleteByDeployment'>
    >;
    let mockLogger: jest.Mocked<Pick<NestLoggerAdapter, 'error'>>;
    let sut: RedisLogStoreAdapter;

    /** Builds the store over the shared fakes with a given configuration. */
    const createStore = (maxLines = 500): RedisLogStoreAdapter => {
        const config = { getOrThrow: jest.fn(() => maxLines) };

        return new RedisLogStoreAdapter(
            connection as unknown as RedisConnection,
            mockRepository,
            mockLogger as unknown as NestLoggerAdapter,
            config as unknown as ConfigService,
        );
    };

    beforeEach(() => {
        jest.clearAllMocks();

        client = new FakeRedis();
        connection = new FakeRedisConnection(client);
        mockRepository = {
            createMany: jest.fn(),
            getAllByDeployment: jest.fn().mockResolvedValue([]),
            deleteByDeployment: jest.fn(),
        };
        mockLogger = { error: jest.fn() };
        sut = createStore();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('append', () => {
        it('appends the line to the deployment stream under the configured line cap', async () => {
            await sut.append('deployment-1', 'building');

            expect(client.xaddCalls).toEqual([
                [key, 'MAXLEN', '~', 500, '*', 'type', 'line', 'content', 'building'],
            ]);
        });

        it('omits the cap when no line limit is configured', async () => {
            sut = createStore(0);

            await sut.append('deployment-1', 'building');

            expect(client.xaddCalls).toEqual([[key, '*', 'type', 'line', 'content', 'building']]);
        });

        it('refreshes the producer lease along with the appended line', async () => {
            await sut.append('deployment-1', 'building');

            expect(client.values.get(leaseKey)).toBe('1');
            expect(client.expirations.get(leaseKey)).toBe(300);
        });

        it('never rejects, reporting a Redis failure to the logger instead', async () => {
            const error = new Error('redis down');

            client.failure = error;

            await expect(sut.append('deployment-1', 'building')).resolves.toBeUndefined();
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Failed to append a log line for deployment deployment-1: redis down',
                error,
                'RedisLogStoreAdapter',
            );
        });
    });

    describe('complete', () => {
        it('writes the terminal entry, archives the whole stream and lets the hot copy expire', async () => {
            await sut.append('deployment-1', 'building');
            await sut.complete('deployment-1', 'success');

            expect(mockRepository.createMany).toHaveBeenCalledTimes(1);
            expect(mockRepository.createMany).toHaveBeenCalledWith([
                {
                    deploymentId: 'deployment-1', seq: 1, type: 'line', content: 'building', status: null,
                },
                {
                    deploymentId: 'deployment-1', seq: 2, type: 'end', content: null, status: 'success',
                },
            ]);
            expect(client.expirations.get(key)).toBe(60);
        });

        it('writes the terminal entry, then archives, and only then sets the expiry', async () => {
            const order: string[] = [];

            mockRepository.createMany.mockImplementation(async () => { order.push('archive'); });
            jest.spyOn(client, 'expire').mockImplementation(async () => {
                order.push('expire');

                return 1;
            });

            await sut.append('deployment-1', 'building');
            await sut.complete('deployment-1', 'success');

            expect(order).toEqual(['archive', 'expire']);
            expect(mockRepository.createMany).toHaveBeenCalledWith([
                {
                    deploymentId: 'deployment-1', seq: 1, type: 'line', content: 'building', status: null,
                },
                {
                    deploymentId: 'deployment-1', seq: 2, type: 'end', content: null, status: 'success',
                },
            ]);
        });

        it('drops the producer lease once the terminal entry is written', async () => {
            await sut.append('deployment-1', 'building');
            await sut.complete('deployment-1', 'success');

            expect(client.values.has(leaseKey)).toBe(false);
        });

        it('keeps the hot copy when the archive failed', async () => {
            mockRepository.createMany.mockRejectedValue(new Error('database down'));

            await sut.append('deployment-1', 'building');
            await sut.complete('deployment-1', 'failed');

            expect(client.expirations.has(key)).toBe(false);
            expect(client.streams.has(key)).toBe(true);
        });

        it('drops the producer lease even when the archive failed', async () => {
            mockRepository.createMany.mockRejectedValue(new Error('database down'));

            await sut.append('deployment-1', 'building');
            await sut.complete('deployment-1', 'failed');

            expect(client.values.has(leaseKey)).toBe(false);
        });

        it('reports a failed archive to the logger instead of rejecting', async () => {
            const error = new Error('database down');

            mockRepository.createMany.mockRejectedValue(error);

            await sut.append('deployment-1', 'building');

            await expect(sut.complete('deployment-1', 'failed')).resolves.toBeUndefined();
            expect(mockLogger.error).toHaveBeenCalledTimes(1);
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Failed to archive the log of deployment deployment-1: database down',
                error,
                'RedisLogStoreAdapter',
            );
        });

        it('never rejects, reporting a Redis failure to the logger instead', async () => {
            const error = new Error('redis down');

            client.failure = error;

            await expect(sut.complete('deployment-1', 'success')).resolves.toBeUndefined();
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Failed to complete the log of deployment deployment-1: redis down',
                error,
                'RedisLogStoreAdapter',
            );
        });
    });

    describe('stream', () => {
        it('serves the whole stream and closes on the terminal entry', async () => {
            await sut.append('deployment-1', 'building');
            await sut.complete('deployment-1', 'success');

            const received: LogEvent[] = await firstValueFrom(sut.stream('deployment-1').pipe(toArray()));

            expect(received).toEqual([
                { type: 'line', data: 'building' },
                { type: 'end', status: 'success' },
            ]);
        });

        it('falls back to the archive once the hot copy is gone', async () => {
            mockRepository.getAllByDeployment.mockResolvedValue([
                {
                    id: 'entry-1',
                    deploymentId: 'deployment-1',
                    seq: 1,
                    createdAt: new Date('2026-01-01T00:00:00.000Z'),
                    type: 'end',
                    status: 'failed',
                },
            ]);

            const received: LogEvent[] = await firstValueFrom(sut.stream('deployment-1').pipe(toArray()));

            expect(received).toEqual([{ type: 'end', status: 'failed' }]);
        });
    });

    describe('purge', () => {
        it('drops the hot copy, the producer lease and the archived entries', async () => {
            await sut.append('deployment-1', 'building');

            await sut.purge('deployment-1');

            expect(client.deleted).toEqual([key, leaseKey]);
            expect(client.streams.has(key)).toBe(false);
            expect(client.values.has(leaseKey)).toBe(false);
            expect(mockRepository.deleteByDeployment).toHaveBeenCalledWith('deployment-1');
        });

        it('never rejects, reporting a Redis failure to the logger instead', async () => {
            const error = new Error('redis down');

            client.failure = error;

            await expect(sut.purge('deployment-1')).resolves.toBeUndefined();
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Failed to purge the log of deployment deployment-1: redis down',
                error,
                'RedisLogStoreAdapter',
            );
        });

        it('never rejects, reporting an archive failure to the logger instead', async () => {
            const error = new Error('database down');

            mockRepository.deleteByDeployment.mockRejectedValue(error);

            await expect(sut.purge('deployment-1')).resolves.toBeUndefined();
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Failed to purge the log of deployment deployment-1: database down',
                error,
                'RedisLogStoreAdapter',
            );
        });
    });
});
