import { ConfigService } from '@nestjs/config';
import { firstValueFrom, toArray } from 'rxjs';

import { CreateLogDto } from '../../../domain/dtos/create-log.dto';
import { LogEntry } from '../../../domain/models/log-entry.models';
import { LogEvent } from '../../../domain/models/log-event.models';
import { LogsRepository } from '../../../domain/repositories/logs.repository';
import { DatabaseLogStoreAdapter } from '../db-log-store.adapter';

import type { AppLogger } from '@core/domain/ports/app-logger.port';

/** Resolves after pending microtasks, letting the replay continuation run. */
const settle = (): Promise<void> =>
    // Block body: a Promise executor's return value is ignored; an expression body would
    // implicitly return the NodeJS.Immediate handle, tripping no-promise-executor-return.
    new Promise<void>((resolve) => {
        setImmediate(resolve);
    });

/** Resolves after a real delay, used to let the time-based flush fire. */
const wait = (ms: number): Promise<void> =>
    new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
    });

/** Stored row shape of the in-memory repository stand-in. */
type Row = CreateLogDto & { id: string; createdAt: Date };

/** In-memory {@link LogsRepository} whose read can be held open to exercise the hand-off. */
interface FakeRepository extends LogsRepository {
    rows: Row[];
    /** Blocks every subsequent read until the returned callback is invoked. */
    holdReads: () => () => void;
}

/**
 * Builds an in-memory logs repository implementing exactly the surface the log
 * store uses, with a switch to stall reads so the replay/live hand-off can be
 * driven deterministically.
 */
function createRepository(): FakeRepository {
    const rows: Row[] = [];
    let gate: Promise<void> | undefined;

    const repository: FakeRepository = {
        rows,
        holdReads: () => {
            let release = (): void => undefined;

            gate = new Promise<void>((resolve) => {
                release = resolve;
            });

            return () => {
                gate = undefined;
                release();
            };
        },
        getAllByDeployment: async (deploymentId: string): Promise<LogEntry[]> => {
            await gate;

            return rows
                .filter((row) => row.deploymentId === deploymentId)
                .sort((left, right) => left.seq - right.seq)
                .map((row): LogEntry => (row.type === 'end'
                    ? {
                        id: row.id,
                        deploymentId: row.deploymentId,
                        seq: row.seq,
                        createdAt: row.createdAt,
                        type: 'end',
                        status: row.status ?? 'success',
                    }
                    : {
                        id: row.id,
                        deploymentId: row.deploymentId,
                        seq: row.seq,
                        createdAt: row.createdAt,
                        type: 'line',
                        data: row.content ?? '',
                    }));
        },
        createMany: (createDtos: CreateLogDto[]): Promise<void> => {
            createDtos.forEach((dto) => {
                rows.push({ ...dto, id: `${dto.deploymentId}:${dto.seq}`, createdAt: new Date() });
            });

            return Promise.resolve();
        },
        getMaxSeq: (deploymentId: string): Promise<number> => Promise.resolve(
            rows
                .filter((row) => row.deploymentId === deploymentId)
                .reduce((highest, row) => Math.max(highest, row.seq), 0),
        ),
        deleteByDeployment: (deploymentId: string): Promise<void> => {
            for (let index = rows.length - 1; index >= 0; index -= 1) {
                if (rows[index].deploymentId === deploymentId) {
                    rows.splice(index, 1);
                }
            }

            return Promise.resolve();
        },
        deleteUpToSeq: (deploymentId: string, seq: number): Promise<void> => {
            for (let index = rows.length - 1; index >= 0; index -= 1) {
                if (rows[index].deploymentId === deploymentId && rows[index].seq <= seq) {
                    rows.splice(index, 1);
                }
            }

            return Promise.resolve();
        },
        deleteCreatedBefore: (threshold: Date): Promise<void> => {
            for (let index = rows.length - 1; index >= 0; index -= 1) {
                if (rows[index].createdAt < threshold) {
                    rows.splice(index, 1);
                }
            }

            return Promise.resolve();
        },
    };

    return repository;
}

describe('DatabaseLogStoreAdapter', () => {
    const id = '9c858901-8a57-4791-81fe-4c455b099bc9';

    let repository: FakeRepository;
    let logger: jest.Mocked<AppLogger>;

    /**
     * Builds a store over the shared fakes, overriding the retention settings
     * only where a test needs them.
     */
    const createStore = (retentionHours = 24, maxLines = 5000): DatabaseLogStoreAdapter => {
        const config = {
            getOrThrow: (key: string): number => (key === 'LOGS_RETENTION_HOURS' ? retentionHours : maxLines),
        } as unknown as ConfigService;

        return new DatabaseLogStoreAdapter(
            repository,
            logger,
            config,
        );
    };

    let store: DatabaseLogStoreAdapter;

    beforeEach(() => {
        jest.clearAllMocks();

        repository = createRepository();
        logger = {
            debug: jest.fn(), log: jest.fn(), warn: jest.fn(), error: jest.fn(),
        };
        store = createStore();
    });

    describe('batching', () => {
        it('keeps a small batch in memory instead of writing a row per line', async () => {
            const createMany = jest.spyOn(repository, 'createMany');

            await store.append(id, 'line 1');
            await store.append(id, 'line 2');

            expect(createMany).not.toHaveBeenCalled();
            expect(repository.rows).toHaveLength(0);
        });

        it('flushes as soon as the batch reaches its size limit', async () => {
            const createMany = jest.spyOn(repository, 'createMany');

            for (let index = 1; index <= 99; index += 1) {
                await store.append(id, `line ${index}`);
            }

            expect(createMany).not.toHaveBeenCalled();

            await store.append(id, 'line 100');

            expect(createMany).toHaveBeenCalledTimes(1);
            expect(createMany.mock.calls[0][0]).toHaveLength(100);
            expect(repository.rows).toHaveLength(100);
        });

        it('flushes a partial batch once the flush interval elapses', async () => {
            await store.append(id, 'line 1');

            expect(repository.rows).toHaveLength(0);

            await wait(400);

            expect(repository.rows).toHaveLength(1);
            expect(repository.rows[0]).toMatchObject({
                deploymentId: id, seq: 1, type: 'line', content: 'line 1',
            });
        });

        it('flushes whatever is buffered when the module shuts down', async () => {
            await store.append(id, 'line 1');
            await store.onModuleDestroy();

            expect(repository.rows).toHaveLength(1);
        });
    });

    describe('sequences', () => {
        it('assigns one monotonic sequence per deployment across lines and the terminal entry', async () => {
            await store.append(id, 'line 1');
            await store.append(id, 'line 2');
            await store.complete(id, 'success');

            expect(repository.rows.map((row) => row.seq)).toEqual([1, 2, 3]);
            expect(repository.rows.map((row) => row.type)).toEqual(['line', 'line', 'end']);
        });

        it('continues from the highest sequence already stored', async () => {
            await repository.createMany([{
                deploymentId: id, seq: 7, type: 'line', content: 'earlier run', status: null,
            }]);

            await store.append(id, 'resumed');
            await store.complete(id, 'failed');

            expect(repository.rows.map((row) => row.seq)).toEqual([7, 8, 9]);
        });

        it('scopes sequences to a single deployment', async () => {
            const other = 'c1a2b3c4-d5e6-47f8-9a0b-1c2d3e4f5a6b';

            await store.append(id, 'mine');
            await store.append(other, 'theirs');
            await store.complete(id, 'success');
            await store.complete(other, 'success');

            expect(repository.rows.filter((row) => row.deploymentId === id).map((row) => row.seq)).toEqual([1, 2]);
            expect(repository.rows.filter((row) => row.deploymentId === other).map((row) => row.seq)).toEqual([1, 2]);
        });
    });

    describe('stream', () => {
        it('replays a finished run from the database and completes', async () => {
            await store.append(id, 'line 1');
            await store.append(id, 'line 2');
            await store.complete(id, 'success');

            const events = await firstValueFrom(store.stream(id).pipe(toArray()));

            expect(events).toEqual<LogEvent[]>([
                { type: 'line', data: 'line 1' },
                { type: 'line', data: 'line 2' },
                { type: 'end', status: 'success' },
            ]);
        });

        it('replays long after the run ended, with no expiry on the stored history', async () => {
            await store.append(id, 'line 1');
            await store.complete(id, 'success');

            // A brand-new store: nothing at all is left in memory, as after a restart.
            const revived = createStore();
            const events = await firstValueFrom(revived.stream(id).pipe(toArray()));

            expect(events).toEqual<LogEvent[]>([
                { type: 'line', data: 'line 1' },
                { type: 'end', status: 'success' },
            ]);
        });

        it('streams live lines to an already-connected subscriber', async () => {
            const received: LogEvent[] = [];
            const subscription = store.stream(id).subscribe((event) => received.push(event));

            await settle();
            await store.append(id, 'live line');
            await settle();
            await store.complete(id, 'failed');
            await settle();

            expect(received).toEqual<LogEvent[]>([
                { type: 'line', data: 'live line' },
                { type: 'end', status: 'failed' },
            ]);

            subscription.unsubscribe();
        });

        it('hands a mid-run late joiner the buffered lines then the live ones, with no gap', async () => {
            // 'buffered' is still in the in-memory batch, unknown to the database.
            await store.append(id, 'buffered');

            const received: LogEvent[] = [];
            const subscription = store.stream(id).subscribe((event) => received.push(event));

            await settle();
            await store.append(id, 'fresh');
            await settle();
            await store.complete(id, 'success');
            await settle();

            expect(received).toEqual<LogEvent[]>([
                { type: 'line', data: 'buffered' },
                { type: 'line', data: 'fresh' },
                { type: 'end', status: 'success' },
            ]);

            subscription.unsubscribe();
        });

        it('replays lines already flushed to the database before the live feed takes over', async () => {
            for (let index = 1; index <= 100; index += 1) {
                await store.append(id, `line ${index}`);
            }

            expect(repository.rows).toHaveLength(100);

            const received: LogEvent[] = [];
            const subscription = store.stream(id).subscribe((event) => received.push(event));

            await settle();
            await store.append(id, 'line 101');
            await settle();

            expect(received).toHaveLength(101);
            expect(received[0]).toEqual<LogEvent>({ type: 'line', data: 'line 1' });
            expect(received[100]).toEqual<LogEvent>({ type: 'line', data: 'line 101' });

            subscription.unsubscribe();
        });

        it('does not duplicate an entry that becomes durable while the replay query is in flight', async () => {
            await store.append(id, 'buffered');

            // Stall the replay read, then let the run finish underneath it: the same
            // entries now exist in the snapshot, in the database and on the live feed.
            const release = repository.holdReads();

            const received: LogEvent[] = [];
            const subscription = store.stream(id).subscribe((event) => received.push(event));

            await settle();
            await store.complete(id, 'success');
            await settle();

            release();
            await settle();

            expect(received).toEqual<LogEvent[]>([
                { type: 'line', data: 'buffered' },
                { type: 'end', status: 'success' },
            ]);

            subscription.unsubscribe();
        });

        it('closes the stream on the terminal event', async () => {
            let completed = false;
            const subscription = store.stream(id).subscribe({ complete: () => { completed = true; } });

            await settle();
            await store.append(id, 'line 1');
            await settle();

            expect(completed).toBe(false);

            await store.complete(id, 'success');
            await settle();

            expect(completed).toBe(true);

            subscription.unsubscribe();
        });

        it('stops delivering to a subscriber that unsubscribed', async () => {
            const received: LogEvent[] = [];
            const subscription = store.stream(id).subscribe((event) => received.push(event));

            await settle();
            subscription.unsubscribe();

            await store.append(id, 'after teardown');
            await store.complete(id, 'success');
            await settle();

            expect(received).toEqual([]);
        });

        it('surfaces a replay failure as a stream error', async () => {
            jest.spyOn(repository, 'getAllByDeployment').mockRejectedValue(new Error('database down'));

            await expect(firstValueFrom(store.stream(id).pipe(toArray()))).rejects.toThrow('database down');
        });
    });

    describe('purge', () => {
        it('deletes the deployment entries and leaves nothing to replay', async () => {
            await store.append(id, 'line 1');
            await store.complete(id, 'success');

            expect(repository.rows).not.toHaveLength(0);

            await store.purge(id);

            expect(repository.rows).toHaveLength(0);
        });

        it('drops the in-memory batch of a run still in flight', async () => {
            await store.append(id, 'line 1');
            await store.purge(id);
            await wait(400);

            expect(repository.rows).toHaveLength(0);
        });
    });

    describe('retention', () => {
        it('trims a deployment beyond the configured line cap', async () => {
            store = createStore(24, 3);

            await store.append(id, 'line 1');
            await store.append(id, 'line 2');
            await store.append(id, 'line 3');
            await store.append(id, 'line 4');
            await store.complete(id, 'success');

            // Sequences 1 and 2 fall outside the 3-entry window ending at sequence 5.
            expect(repository.rows.map((row) => row.seq)).toEqual([3, 4, 5]);
        });

        it('drops entries older than the configured window when a run completes', async () => {
            await repository.createMany([{
                deploymentId: 'c1a2b3c4-d5e6-47f8-9a0b-1c2d3e4f5a6b',
                seq: 1,
                type: 'line',
                content: 'ancient',
                status: null,
            }]);
            repository.rows[0].createdAt = new Date(Date.now() - (48 * 60 * 60 * 1000));

            await store.append(id, 'line 1');
            await store.complete(id, 'success');

            expect(repository.rows.some((row) => row.content === 'ancient')).toBe(false);
            expect(repository.rows).toHaveLength(2);
        });

        it('skips the age sweep when retention is disabled', async () => {
            store = createStore(0);

            const deleteCreatedBefore = jest.spyOn(repository, 'deleteCreatedBefore');

            await store.append(id, 'line 1');
            await store.complete(id, 'success');

            expect(deleteCreatedBefore).not.toHaveBeenCalled();
        });
    });

    describe('failures', () => {
        it('logs a failed write instead of rejecting the append', async () => {
            jest.spyOn(repository, 'createMany').mockRejectedValue(new Error('write failed'));

            await store.append(id, 'line 1');

            await expect(store.complete(id, 'success')).resolves.toBeUndefined();
            expect(logger.error).toHaveBeenCalledWith(
                expect.stringContaining('Failed to persist'),
                expect.any(Error),
                'DatabaseLogStoreAdapter',
            );
        });

        it('logs a failed sequence seed instead of rejecting the append', async () => {
            jest.spyOn(repository, 'getMaxSeq').mockRejectedValue(new Error('database down'));

            await expect(store.append(id, 'line 1')).resolves.toBeUndefined();
            expect(logger.error).toHaveBeenCalledWith(
                expect.stringContaining('Failed to append a log line'),
                expect.any(Error),
                'DatabaseLogStoreAdapter',
            );
        });
    });
});
