import { of } from 'rxjs';

import { LogsDatabaseRepository } from '../../database/logs-db.repository';
import { RedisLogStoreRepository } from '../../redis/redis-log-store.repository';
import { PersistentLogStoreRepository } from '../persistent-log-store.repository';

describe('PersistentLogStoreRepository', () => {
    const streamId = '9c858901-8a57-4791-81fe-4c455b099bc9';

    let logStore: jest.Mocked<Pick<RedisLogStoreRepository, 'append' | 'complete' | 'stream' | 'purge'>>;
    let logsRepository: jest.Mocked<Pick<LogsDatabaseRepository, 'createMany'>>;
    let sut: PersistentLogStoreRepository;

    beforeEach(() => {
        logStore = {
            append: jest.fn().mockResolvedValue(undefined),
            complete: jest.fn().mockResolvedValue(undefined),
            stream: jest.fn(),
            purge: jest.fn().mockResolvedValue(undefined),
        };
        logsRepository = {
            createMany: jest.fn().mockResolvedValue([]),
        };

        sut = new PersistentLogStoreRepository(
            logStore as unknown as RedisLogStoreRepository,
            logsRepository as unknown as LogsDatabaseRepository,
        );
    });

    it('publishes each appended line live through the redis store', async () => {
        await sut.append(streamId, 'building service');

        expect(logStore.append).toHaveBeenCalledWith(streamId, 'building service');
    });

    it('persists the buffered stream as ordered rows and completes the redis store on success', async () => {
        await sut.append(streamId, 'building service');
        await sut.append(streamId, 'stack up');
        await sut.complete(streamId, 'success');

        expect(logsRepository.createMany).toHaveBeenCalledWith([
            {
                deploymentId: streamId, seq: 1, type: 'line', content: 'building service', status: null,
            },
            {
                deploymentId: streamId, seq: 2, type: 'line', content: 'stack up', status: null,
            },
            {
                deploymentId: streamId, seq: 3, type: 'end', content: null, status: 'success',
            },
        ]);
        expect(logStore.complete).toHaveBeenCalledWith(streamId, 'success');
    });

    it('persists the buffered failure line and a failed end row', async () => {
        await sut.append(streamId, '✖ Deployment failed: build failed');
        await sut.complete(streamId, 'failed');

        expect(logsRepository.createMany).toHaveBeenCalledWith([
            {
                deploymentId: streamId, seq: 1, type: 'line', content: '✖ Deployment failed: build failed', status: null,
            },
            {
                deploymentId: streamId, seq: 2, type: 'end', content: null, status: 'failed',
            },
        ]);
        expect(logStore.complete).toHaveBeenCalledWith(streamId, 'failed');
    });

    it('persists only a terminal end row when no lines were appended', async () => {
        await sut.complete(streamId, 'success');

        expect(logsRepository.createMany).toHaveBeenCalledWith([
            {
                deploymentId: streamId, seq: 1, type: 'end', content: null, status: 'success',
            },
        ]);
    });

    it('clears a stream buffer after completing it', async () => {
        await sut.append(streamId, 'first run line');
        await sut.complete(streamId, 'success');
        await sut.complete(streamId, 'success');

        expect(logsRepository.createMany).toHaveBeenLastCalledWith([
            {
                deploymentId: streamId, seq: 1, type: 'end', content: null, status: 'success',
            },
        ]);
    });

    it('clears the in-memory buffer and delegates purge to the redis store', async () => {
        await sut.append(streamId, 'buffered line');

        await sut.purge(streamId);

        expect(logStore.purge).toHaveBeenCalledWith(streamId);

        // A subsequent completion persists only a terminal row, proving the buffer was dropped.
        await sut.complete(streamId, 'success');

        expect(logsRepository.createMany).toHaveBeenLastCalledWith([
            {
                deploymentId: streamId, seq: 1, type: 'end', content: null, status: 'success',
            },
        ]);
    });

    it('delegates streaming to the redis store', () => {
        const observable = of({ type: 'line' as const, data: 'live' });

        logStore.stream.mockReturnValue(observable);

        expect(sut.stream(streamId)).toBe(observable);
        expect(logStore.stream).toHaveBeenCalledWith(streamId);
    });
});
