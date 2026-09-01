import type { RuntimeLogLine } from '@gitpaas/contracts';
import { Subscription } from 'rxjs';

import { RuntimeLogEntry } from '../../../domain/models/runtime-log.models';
import { RuntimeLogsRepository } from '../../../domain/repositories/runtime-logs.repository';
import { DatabaseRuntimeLogsRepository } from '../../database/db-runtime-logs.repository';
import { MemoryRuntimeLogStoreAdapter } from '../memory-runtime-log-store.adapter';
import { RUNTIME_LOG_FLUSH_INTERVAL_MS, RUNTIME_LOG_FLUSH_SIZE } from '../runtime-log-store.constants';

import type { AppLogger } from '@core/domain/ports/app-logger.port';

/** Builds a line of the output of a container, overriding only the fields under test. */
const logLine = (overrides: Partial<RuntimeLogLine> = {}): RuntimeLogLine => ({
    timestamp: '2026-08-21T12:00:00.000Z',
    source: 'stdout',
    text: 'listening on 3000',
    ...overrides,
});

/** Builds a persisted line of the output of a container, overriding only the fields under test. */
const logEntry = (overrides: Partial<RuntimeLogEntry> = {}): RuntimeLogEntry => ({
    id: '1',
    containerId: 'container-1',
    timestamp: new Date('2026-08-21T11:00:00.000Z'),
    source: 'stdout',
    text: 'starting',
    createdAt: new Date('2026-08-21T11:00:00.000Z'),
    ...overrides,
});

describe('MemoryRuntimeLogStoreAdapter', () => {
    const containerId = 'container-1';

    let mockRepository: jest.Mocked<Pick<RuntimeLogsRepository, 'createMany' | 'getByContainer'>>;
    let mockLogger: jest.Mocked<AppLogger>;
    let subscriptions: Subscription[];
    let sut: MemoryRuntimeLogStoreAdapter;

    /** Subscribes to the live stream of a container, collecting its lines and its end. */
    const listen = (id: string): { lines: RuntimeLogLine[]; ended: boolean } => {
        const received = { lines: [] as RuntimeLogLine[], ended: false };

        subscriptions.push(sut.stream(id).subscribe({
            next: (line) => received.lines.push(line),
            complete: () => { received.ended = true; },
        }));

        return received;
    };

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();

        subscriptions = [];
        mockRepository = {
            createMany: jest.fn().mockResolvedValue(undefined),
            getByContainer: jest.fn().mockResolvedValue([]),
        };
        mockLogger = {
            debug: jest.fn(),
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
        };
        sut = new MemoryRuntimeLogStoreAdapter(
            mockRepository as unknown as DatabaseRuntimeLogsRepository,
            mockLogger,
        );
    });

    afterEach(() => {
        for (const subscription of subscriptions) {
            subscription.unsubscribe();
        }

        jest.useRealTimers();
    });

    describe('append', () => {
        it('publishes the line to the client that listens to that container', () => {
            const received = listen(containerId);
            const line = logLine();

            sut.append(containerId, line);

            expect(received.lines).toEqual([line]);
        });

        it('never publishes the line to the client of a different container', () => {
            const received = listen('container-2');

            sut.append(containerId, logLine());

            expect(received.lines).toEqual([]);
        });

        it('writes nothing while the batch stays under its size and inside its interval', () => {
            sut.append(containerId, logLine());

            expect(mockRepository.createMany).not.toHaveBeenCalled();
        });
    });

    describe('when the batch reaches its size', () => {
        it('writes the whole batch in one call', async () => {
            for (let index = 0; index < RUNTIME_LOG_FLUSH_SIZE; index += 1) {
                sut.append(containerId, logLine({ text: `line ${index}` }));
            }

            await Promise.resolve();

            expect(mockRepository.createMany).toHaveBeenCalledTimes(1);
            expect(mockRepository.createMany.mock.calls[0][0]).toHaveLength(RUNTIME_LOG_FLUSH_SIZE);
        });

        it('keeps the lines that arrive after that write for the next one', async () => {
            for (let index = 0; index < RUNTIME_LOG_FLUSH_SIZE; index += 1) {
                sut.append(containerId, logLine({ text: `line ${index}` }));
            }
            await Promise.resolve();

            sut.append(containerId, logLine({ text: 'later' }));
            await jest.advanceTimersByTimeAsync(RUNTIME_LOG_FLUSH_INTERVAL_MS);

            expect(mockRepository.createMany).toHaveBeenCalledTimes(2);
            expect(mockRepository.createMany).toHaveBeenLastCalledWith([expect.objectContaining({ text: 'later' })]);
        });
    });

    describe('when the batch reaches its interval', () => {
        it('writes the lines that waited, mapped onto the data of their rows', async () => {
            sut.append(containerId, logLine());

            await jest.advanceTimersByTimeAsync(RUNTIME_LOG_FLUSH_INTERVAL_MS);

            expect(mockRepository.createMany).toHaveBeenCalledTimes(1);
            expect(mockRepository.createMany).toHaveBeenCalledWith([{
                containerId,
                timestamp: new Date('2026-08-21T12:00:00.000Z'),
                source: 'stdout',
                text: 'listening on 3000',
            }]);
        });

        it('holds the lines until that interval passes', async () => {
            sut.append(containerId, logLine());

            await jest.advanceTimersByTimeAsync(RUNTIME_LOG_FLUSH_INTERVAL_MS - 1);

            expect(mockRepository.createMany).not.toHaveBeenCalled();
        });

        it('writes the lines of every container of the batch in one call', async () => {
            sut.append(containerId, logLine({ text: 'from one' }));
            sut.append('container-2', logLine({ text: 'from two' }));

            await jest.advanceTimersByTimeAsync(RUNTIME_LOG_FLUSH_INTERVAL_MS);

            expect(mockRepository.createMany).toHaveBeenCalledTimes(1);
            expect(mockRepository.createMany.mock.calls[0][0]).toHaveLength(2);
        });

        it('opens no new interval while no line waits', async () => {
            sut.append(containerId, logLine());
            await jest.advanceTimersByTimeAsync(RUNTIME_LOG_FLUSH_INTERVAL_MS);

            await jest.advanceTimersByTimeAsync(RUNTIME_LOG_FLUSH_INTERVAL_MS * 3);

            expect(mockRepository.createMany).toHaveBeenCalledTimes(1);
        });
    });

    describe('when the write fails', () => {
        const error = new Error('connection terminated');

        beforeEach(() => {
            mockRepository.createMany.mockRejectedValueOnce(error);
        });

        it('writes the failure into the log of the application, and throws nothing', async () => {
            sut.append(containerId, logLine());

            await expect(sut.flush()).resolves.toBeUndefined();

            expect(mockLogger.error).toHaveBeenCalledTimes(1);
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Failed to write 1 line(s) of the output of a container: connection terminated',
                error,
                'RuntimeLogStore',
            );
        });

        it('never writes the lines it lost again on the next batch', async () => {
            sut.append(containerId, logLine({ text: 'lost' }));
            await sut.flush();

            sut.append(containerId, logLine({ text: 'kept' }));
            await sut.flush();

            expect(mockRepository.createMany).toHaveBeenLastCalledWith([expect.objectContaining({ text: 'kept' })]);
        });
    });

    describe('flush', () => {
        it('asks the repository for nothing when no line waits', async () => {
            await sut.flush();

            expect(mockRepository.createMany).not.toHaveBeenCalled();
        });
    });

    describe('read', () => {
        it('gives the persisted lines of that container, and passes the options to the repository', async () => {
            const options = { tail: 10, since: new Date('2026-08-21T10:00:00.000Z') };
            mockRepository.getByContainer.mockResolvedValue([logEntry()]);

            const result = await sut.read(containerId, options);

            expect(mockRepository.getByContainer).toHaveBeenCalledWith(containerId, options);
            expect(result).toEqual([{ timestamp: '2026-08-21T11:00:00.000Z', source: 'stdout', text: 'starting' }]);
        });

        it('adds the lines that still wait for the next write, after the persisted ones', async () => {
            mockRepository.getByContainer.mockResolvedValue([logEntry()]);
            sut.append(containerId, logLine({ text: 'waiting' }));

            const result = await sut.read(containerId);

            expect(result.map((line) => line.text)).toEqual(['starting', 'waiting']);
        });

        it('never adds the waiting line of a different container', async () => {
            sut.append('container-2', logLine({ text: 'from two' }));

            const result = await sut.read(containerId);

            expect(result).toEqual([]);
        });

        it('drops the waiting line the instant of the read leaves out', async () => {
            sut.append(containerId, logLine({ timestamp: '2026-08-21T09:00:00.000Z', text: 'old' }));
            sut.append(containerId, logLine({ timestamp: '2026-08-21T12:00:00.000Z', text: 'new' }));

            const result = await sut.read(containerId, { since: new Date('2026-08-21T10:00:00.000Z') });

            expect(result.map((line) => line.text)).toEqual(['new']);
        });

        it('takes the last lines of the merge when the read asks for a tail', async () => {
            mockRepository.getByContainer.mockResolvedValue([logEntry({ text: 'stored' })]);
            sut.append(containerId, logLine({ text: 'waiting' }));

            const result = await sut.read(containerId, { tail: 1 });

            expect(result.map((line) => line.text)).toEqual(['waiting']);
        });

        it('propagates the failure of the repository', async () => {
            const error = new Error('connection terminated');
            mockRepository.getByContainer.mockRejectedValue(error);

            await expect(sut.read(containerId)).rejects.toThrow(error);
        });
    });

    describe('close', () => {
        it('ends the stream of the clients of that container', () => {
            const received = listen(containerId);

            sut.close(containerId);

            expect(received.ended).toBe(true);
        });

        it('writes nothing, so the lines that wait keep waiting', async () => {
            sut.append(containerId, logLine());

            sut.close(containerId);

            expect(mockRepository.createMany).not.toHaveBeenCalled();

            await jest.advanceTimersByTimeAsync(RUNTIME_LOG_FLUSH_INTERVAL_MS);

            expect(mockRepository.createMany).toHaveBeenCalledTimes(1);
        });

        it('gives a stream that runs again to the client that comes after it', () => {
            listen(containerId);
            sut.close(containerId);

            const received = listen(containerId);
            sut.append(containerId, logLine({ text: 'again' }));

            expect(received.ended).toBe(false);
            expect(received.lines.map((line) => line.text)).toEqual(['again']);
        });

        it('ends nothing when no client listens to that container', () => {
            expect(() => { sut.close('container-9'); }).not.toThrow();
        });
    });

    describe('onModuleDestroy', () => {
        it('writes the lines that wait, and ends every stream', async () => {
            const received = listen(containerId);
            sut.append(containerId, logLine());

            await sut.onModuleDestroy();

            expect(mockRepository.createMany).toHaveBeenCalledTimes(1);
            expect(received.ended).toBe(true);
        });
    });
});
