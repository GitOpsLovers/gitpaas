import { Subject } from 'rxjs';

import { CreateLogDto } from '../../../domain/dtos/create-log.dto';
import { LogsRepository } from '../../../domain/repositories/logs.repository';
import { cancelFlush, commitBatch, flushBatch } from '../db-log-batcher';
import { BATCH_SIZE, LOG_STORE_CONTEXT } from '../db-log-store.constants';
import { SequencedLogEvent } from '../db-log-store.transformer';
import { StreamState } from '../db-log-stream-registry';
import { trimStream } from '../db-log-trimmer';

import type { AppLogger } from '@core/domain/ports/app-logger.port';

jest.mock('../db-log-trimmer', () => ({ trimStream: jest.fn() }));

/** Resolves after pending microtasks, letting the queued write settle. */
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

describe('LogBatcher', () => {
    const id = '9c858901-8a57-4791-81fe-4c455b099bc9';

    /** Per-deployment line cap handed to the batcher under test. */
    const maxLines = 5000;

    /** Builds a sequenced line event. */
    const lineEvent = (seq: number): SequencedLogEvent => ({ seq, type: 'line', data: `line ${seq}` });

    /** Builds the live state of a stream, overriding only the fields under test. */
    const streamState = (overrides: Partial<StreamState> = {}): StreamState => ({
        events$: new Subject<SequencedLogEvent>(),
        pending: [],
        writing: [],
        writes: Promise.resolve(),
        producing: true,
        ...overrides,
    });

    /** Builds a stream state whose buffer already holds a number of line events. */
    const bufferedState = (count: number): StreamState => streamState({
        pending: Array.from({ length: count }, (_value, index) => lineEvent(index + 1)),
    });

    const mockTrimStream = trimStream as jest.MockedFunction<typeof trimStream>;

    let mockLogsRepository: jest.Mocked<Pick<LogsRepository, 'createMany'>>;
    let mockLogger: jest.Mocked<AppLogger>;
    let repository: LogsRepository;

    /** Applies the batching policy over the shared fakes. */
    const commit = (streamId: string, state: StreamState): Promise<void> =>
        commitBatch(repository, mockLogger, maxLines, streamId, state);

    /** Writes the buffered batch out over the shared fakes. */
    const flush = (streamId: string, state: StreamState): Promise<void> =>
        flushBatch(repository, mockLogger, maxLines, streamId, state);

    beforeEach(() => {
        jest.clearAllMocks();

        mockLogsRepository = { createMany: jest.fn().mockResolvedValue(undefined) };
        mockLogger = {
            debug: jest.fn(), log: jest.fn(), warn: jest.fn(), error: jest.fn(),
        };
        mockTrimStream.mockResolvedValue(undefined);
        repository = mockLogsRepository as unknown as LogsRepository;
    });

    describe('commit', () => {
        it('buffers a partial batch instead of writing a row per line', async () => {
            const state = bufferedState(2);

            await commit(id, state);

            expect(mockLogsRepository.createMany).not.toHaveBeenCalled();
            expect(state.pending).toHaveLength(2);
        });

        it('arms the time-based flush for a partial batch', async () => {
            const state = bufferedState(1);

            await commit(id, state);

            expect(state.timer).toBeDefined();

            cancelFlush(state);
        });

        it('never re-arms the timer while one is already pending', async () => {
            const state = bufferedState(1);

            await commit(id, state);

            const armed = state.timer;

            state.pending.push(lineEvent(2));
            await commit(id, state);

            expect(state.timer).toBe(armed);

            cancelFlush(state);
        });

        it('writes the batch out as soon as it reaches the size limit', async () => {
            const state = bufferedState(BATCH_SIZE);

            await commit(id, state);
            await settle();

            expect(mockLogsRepository.createMany).toHaveBeenCalledTimes(1);
            expect(mockLogsRepository.createMany.mock.calls[0][0]).toHaveLength(BATCH_SIZE);
            expect(state.pending).toEqual([]);
        });

        it('never arms a timer when it writes the full batch', async () => {
            const state = bufferedState(BATCH_SIZE);

            await commit(id, state);

            expect(state.timer).toBeUndefined();
        });

        it('writes the batch out once the flush interval elapses', async () => {
            const state = bufferedState(1);

            await commit(id, state);

            expect(mockLogsRepository.createMany).not.toHaveBeenCalled();

            await wait(400);

            expect(mockLogsRepository.createMany).toHaveBeenCalledTimes(1);
            expect(state.pending).toEqual([]);
        });
    });

    describe('flush', () => {
        it('maps every buffered event onto the row that persists it', async () => {
            const state = streamState({
                pending: [{ seq: 1, type: 'line', data: 'line 1' }, { seq: 2, type: 'end', status: 'failed' }],
            });

            await flush(id, state);

            expect(mockLogsRepository.createMany).toHaveBeenCalledWith<[CreateLogDto[]]>([
                {
                    deploymentId: id, seq: 1, type: 'line', content: 'line 1', status: null,
                },
                {
                    deploymentId: id, seq: 2, type: 'end', content: null, status: 'failed',
                },
            ]);
        });

        it('empties the buffer and keeps the batch visible while the write is in flight', () => {
            const state = bufferedState(2);

            const settled = flush(id, state);

            expect(state.pending).toEqual([]);
            expect(state.writing).toHaveLength(2);

            return settled;
        });

        it('drops the batch from the in-flight list once the write is durable', async () => {
            const state = bufferedState(2);

            await flush(id, state);

            expect(state.writing).toEqual([]);
        });

        it('trims the stream up to the highest sequence of the written batch', async () => {
            const state = bufferedState(3);

            await flush(id, state);

            expect(mockTrimStream).toHaveBeenCalledTimes(1);
            expect(mockTrimStream).toHaveBeenCalledWith(repository, id, 3, maxLines);
        });

        it('never writes when nothing is buffered', async () => {
            const state = streamState();

            await flush(id, state);

            expect(mockLogsRepository.createMany).not.toHaveBeenCalled();
            expect(mockTrimStream).not.toHaveBeenCalled();
        });

        it('returns the pending write chain when nothing is buffered', () => {
            const state = streamState();

            expect(flush(id, state)).toBe(state.writes);
        });

        it('disarms the pending time-based flush', async () => {
            const state = bufferedState(1);

            await commit(id, state);
            await flush(id, state);

            expect(state.timer).toBeUndefined();
        });

        it('writes batches in the order they were flushed', async () => {
            const order: number[][] = [];

            mockLogsRepository.createMany.mockImplementation(async (dtos: CreateLogDto[]) => {
                await settle();
                order.push(dtos.map((dto) => dto.seq));
            });

            const state = streamState({ pending: [lineEvent(1)] });

            const first = flush(id, state);

            state.pending.push(lineEvent(2));

            const second = flush(id, state);

            await Promise.all([first, second]);

            expect(order).toEqual([[1], [2]]);
        });

        it('logs a failing write instead of rejecting the flush', async () => {
            const error = new Error('write failed');

            mockLogsRepository.createMany.mockRejectedValue(error);

            await expect(flush(id, bufferedState(2))).resolves.toBeUndefined();
            expect(mockLogger.error).toHaveBeenCalledTimes(1);
            expect(mockLogger.error).toHaveBeenCalledWith(
                `Failed to persist 2 log entrie(s) for deployment ${id}: write failed`,
                error,
                LOG_STORE_CONTEXT,
            );
        });

        it('stringifies a thrown non-error value in the failure message', async () => {
            mockLogsRepository.createMany.mockRejectedValue('connection reset');

            await flush(id, bufferedState(1));

            expect(mockLogger.error).toHaveBeenCalledWith(
                `Failed to persist 1 log entrie(s) for deployment ${id}: connection reset`,
                'connection reset',
                LOG_STORE_CONTEXT,
            );
        });

        it('never trims when the write failed', async () => {
            mockLogsRepository.createMany.mockRejectedValue(new Error('write failed'));

            await flush(id, bufferedState(2));

            expect(mockTrimStream).not.toHaveBeenCalled();
        });

        it('clears the in-flight list even when the write failed', async () => {
            mockLogsRepository.createMany.mockRejectedValue(new Error('write failed'));

            const state = bufferedState(2);

            await flush(id, state);

            expect(state.writing).toEqual([]);
        });

        it('keeps the write chain usable after a failed batch', async () => {
            mockLogsRepository.createMany.mockRejectedValueOnce(new Error('write failed'));

            const state = streamState({ pending: [lineEvent(1)] });

            await flush(id, state);

            state.pending.push(lineEvent(2));
            await flush(id, state);

            expect(mockLogsRepository.createMany).toHaveBeenCalledTimes(2);
            expect(mockTrimStream).toHaveBeenCalledWith(repository, id, 2, maxLines);
        });
    });

    describe('cancel', () => {
        it('disarms a pending time-based flush', async () => {
            const state = bufferedState(1);

            await commit(id, state);
            cancelFlush(state);

            expect(state.timer).toBeUndefined();
        });

        it('never writes the batch after the timer was disarmed', async () => {
            const state = bufferedState(1);

            await commit(id, state);
            cancelFlush(state);

            await wait(400);

            expect(mockLogsRepository.createMany).not.toHaveBeenCalled();
            expect(state.pending).toHaveLength(1);
        });

        it('leaves the state untouched when no flush is armed', () => {
            const state = bufferedState(1);

            cancelFlush(state);

            expect(state.timer).toBeUndefined();
            expect(state.pending).toHaveLength(1);
        });
    });
});
