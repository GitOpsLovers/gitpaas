import { Observable, Subject, Subscription } from 'rxjs';

import { LogEntry } from '../../../domain/models/log-entry.models';
import { LogEvent, LogStatus } from '../../../domain/models/log-event.models';
import { LogsRepository } from '../../../domain/repositories/logs.repository';
import { mergeReplayWithLive } from '../db-log-replay-merger';
import { SequencedLogEvent } from '../db-log-store.transformer';
import { StreamState } from '../db-log-stream-registry';

/** Resolves after pending microtasks, letting the replay continuation run. */
const settle = (): Promise<void> =>
    // Block body: a Promise executor's return value is ignored; an expression body would
    // implicitly return the NodeJS.Immediate handle, tripping no-promise-executor-return.
    new Promise<void>((resolve) => {
        setImmediate(resolve);
    });

describe('mergeReplayWithLive', () => {
    const id = '9c858901-8a57-4791-81fe-4c455b099bc9';

    /** Builds a persisted line entry. */
    const lineEntry = (seq: number, data = `line ${seq}`): LogEntry => ({
        id: `${id}:${seq}`,
        deploymentId: id,
        seq,
        createdAt: new Date('2026-01-15T12:00:00.000Z'),
        type: 'line',
        data,
    });

    /** Builds a persisted terminal entry. */
    const endEntry = (seq: number, status: LogStatus = 'success'): LogEntry => ({
        id: `${id}:${seq}`,
        deploymentId: id,
        seq,
        createdAt: new Date('2026-01-15T12:00:00.000Z'),
        type: 'end',
        status,
    });

    /** Builds a sequenced line event. */
    const lineEvent = (seq: number, data = `line ${seq}`): SequencedLogEvent => ({ seq, type: 'line', data });

    /** Builds the live state of a stream, overriding only the fields under test. */
    const streamState = (overrides: Partial<StreamState> = {}): StreamState => ({
        events$: new Subject<SequencedLogEvent>(),
        pending: [],
        writing: [],
        writes: Promise.resolve(),
        producing: true,
        ...overrides,
    });

    /** A promise plus the handle that settles it, used to hold the replay query open. */
    const deferred = (): { promise: Promise<LogEntry[]>; resolve: (entries: LogEntry[]) => void } => {
        let resolve = (_entries: LogEntry[]): void => undefined;

        const promise = new Promise<LogEntry[]>((settleWith) => {
            resolve = settleWith;
        });

        return { promise, resolve };
    };

    let mockLogsRepository: jest.Mocked<Pick<LogsRepository, 'getAllByDeployment'>>;

    /** Subscribes to the merge exactly as the store's cold observable does. */
    const subscribeTo = (state: StreamState): {
        received: LogEvent[];
        completed: () => boolean;
        error: () => unknown;
        subscription: Subscription;
    } => {
        const received: LogEvent[] = [];
        let completed = false;
        let error: unknown;

        const subscription = new Observable<LogEvent>(
            (subscriber) => mergeReplayWithLive(
                mockLogsRepository as unknown as LogsRepository,
                id,
                state,
                subscriber,
            ),
        ).subscribe({
            next: (event) => received.push(event),
            error: (caught: unknown) => { error = caught; },
            complete: () => { completed = true; },
        });

        return {
            received, completed: () => completed, error: () => error, subscription,
        };
    };

    beforeEach(() => {
        jest.clearAllMocks();

        mockLogsRepository = { getAllByDeployment: jest.fn().mockResolvedValue([]) };
    });

    it('reads the stored entries of the requested stream once', async () => {
        subscribeTo(streamState());

        await settle();

        expect(mockLogsRepository.getAllByDeployment).toHaveBeenCalledTimes(1);
        expect(mockLogsRepository.getAllByDeployment).toHaveBeenCalledWith(id);
    });

    it('replays the stored entries as domain events, dropping the transport sequence', async () => {
        mockLogsRepository.getAllByDeployment.mockResolvedValue([lineEntry(1), lineEntry(2), endEntry(3, 'failed')]);

        const watcher = subscribeTo(streamState());

        await settle();

        expect(watcher.received).toEqual<LogEvent[]>([
            { type: 'line', data: 'line 1' },
            { type: 'line', data: 'line 2' },
            { type: 'end', status: 'failed' },
        ]);
    });

    it('completes the stream on the terminal entry', async () => {
        mockLogsRepository.getAllByDeployment.mockResolvedValue([endEntry(1)]);

        const watcher = subscribeTo(streamState());

        await settle();

        expect(watcher.completed()).toBe(true);
    });

    it('leaves the stream open while the run has no terminal entry yet', async () => {
        mockLogsRepository.getAllByDeployment.mockResolvedValue([lineEntry(1)]);

        const watcher = subscribeTo(streamState());

        await settle();

        expect(watcher.completed()).toBe(false);

        watcher.subscription.unsubscribe();
    });

    it('replays the still-unwritten batch after the stored entries', async () => {
        mockLogsRepository.getAllByDeployment.mockResolvedValue([lineEntry(1)]);

        const state = streamState({ writing: [lineEvent(2)], pending: [lineEvent(3)] });
        const watcher = subscribeTo(state);

        await settle();

        expect(watcher.received).toEqual<LogEvent[]>([
            { type: 'line', data: 'line 1' },
            { type: 'line', data: 'line 2' },
            { type: 'line', data: 'line 3' },
        ]);

        watcher.subscription.unsubscribe();
    });

    it('emits an entry only once when it is both stored and still unflushed', async () => {
        mockLogsRepository.getAllByDeployment.mockResolvedValue([lineEntry(1), lineEntry(2)]);

        const state = streamState({ writing: [lineEvent(2)] });
        const watcher = subscribeTo(state);

        await settle();

        expect(watcher.received).toEqual<LogEvent[]>([
            { type: 'line', data: 'line 1' },
            { type: 'line', data: 'line 2' },
        ]);

        watcher.subscription.unsubscribe();
    });

    it('holds live events back until the replay drained, then emits them in order', async () => {
        const stored = deferred();

        mockLogsRepository.getAllByDeployment.mockReturnValue(stored.promise);

        const state = streamState();
        const watcher = subscribeTo(state);

        state.events$.next(lineEvent(2));

        expect(watcher.received).toEqual([]);

        stored.resolve([lineEntry(1)]);
        await settle();

        expect(watcher.received).toEqual<LogEvent[]>([
            { type: 'line', data: 'line 1' },
            { type: 'line', data: 'line 2' },
        ]);

        watcher.subscription.unsubscribe();
    });

    it('never duplicates an entry that became durable while the replay was in flight', async () => {
        const stored = deferred();

        mockLogsRepository.getAllByDeployment.mockReturnValue(stored.promise);

        const state = streamState({ pending: [lineEvent(1)] });
        const watcher = subscribeTo(state);

        // The same entry reaches the subscriber three ways: the snapshot, the live
        // feed and the stored rows the query finally returns.
        state.events$.next(lineEvent(1));
        stored.resolve([lineEntry(1)]);
        await settle();

        expect(watcher.received).toEqual<LogEvent[]>([{ type: 'line', data: 'line 1' }]);

        watcher.subscription.unsubscribe();
    });

    it('emits live events straight through once the replay drained', async () => {
        const state = streamState();
        const watcher = subscribeTo(state);

        await settle();

        state.events$.next(lineEvent(1));
        state.events$.next(lineEvent(2));

        expect(watcher.received).toEqual<LogEvent[]>([
            { type: 'line', data: 'line 1' },
            { type: 'line', data: 'line 2' },
        ]);

        watcher.subscription.unsubscribe();
    });

    it('drops an out-of-order event whose sequence was already emitted', async () => {
        const state = streamState();
        const watcher = subscribeTo(state);

        await settle();

        state.events$.next(lineEvent(2));
        state.events$.next(lineEvent(1, 'stale'));
        state.events$.next(lineEvent(3));

        expect(watcher.received).toEqual<LogEvent[]>([
            { type: 'line', data: 'line 2' },
            { type: 'line', data: 'line 3' },
        ]);

        watcher.subscription.unsubscribe();
    });

    it('emits nothing after the terminal event', async () => {
        const state = streamState();
        const watcher = subscribeTo(state);

        await settle();

        state.events$.next({ seq: 1, type: 'end', status: 'success' });
        state.events$.next(lineEvent(2));

        expect(watcher.received).toEqual<LogEvent[]>([{ type: 'end', status: 'success' }]);
        expect(watcher.completed()).toBe(true);
    });

    it('completes when the live channel closes without a terminal event', async () => {
        const state = streamState();
        const watcher = subscribeTo(state);

        await settle();

        state.events$.complete();

        expect(watcher.completed()).toBe(true);
    });

    it('completes when the live channel closed while the replay was in flight', async () => {
        const stored = deferred();

        mockLogsRepository.getAllByDeployment.mockReturnValue(stored.promise);

        const state = streamState();
        const watcher = subscribeTo(state);

        state.events$.complete();

        expect(watcher.completed()).toBe(false);

        stored.resolve([lineEntry(1)]);
        await settle();

        expect(watcher.received).toEqual<LogEvent[]>([{ type: 'line', data: 'line 1' }]);
        expect(watcher.completed()).toBe(true);
    });

    it('surfaces a failing replay query as a stream error', async () => {
        const error = new Error('database down');

        mockLogsRepository.getAllByDeployment.mockRejectedValue(error);

        const watcher = subscribeTo(streamState());

        await settle();

        expect(watcher.error()).toBe(error);
    });

    it('surfaces a live-channel error as a stream error', async () => {
        const error = new Error('producer failed');
        const state = streamState();
        const watcher = subscribeTo(state);

        await settle();

        state.events$.error(error);

        expect(watcher.error()).toBe(error);
    });

    it('detaches the subscriber from the live channel on teardown', async () => {
        const state = streamState();
        const watcher = subscribeTo(state);

        await settle();
        watcher.subscription.unsubscribe();

        state.events$.next(lineEvent(1));

        expect(watcher.received).toEqual([]);
        expect(state.events$.observed).toBe(false);
    });
});
