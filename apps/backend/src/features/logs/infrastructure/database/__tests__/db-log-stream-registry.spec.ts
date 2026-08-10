import { Subject } from 'rxjs';

import { SequencedLogEvent } from '../db-log-store.transformer';
import {
    acquireStream,
    discardStream,
    getStream,
    releaseStream,
    StreamRegistry,
    StreamState,
    streamEntries,
} from '../db-log-stream-registry';

describe('stream registry', () => {
    const id = '9c858901-8a57-4791-81fe-4c455b099bc9';
    const other = 'c1a2b3c4-d5e6-47f8-9a0b-1c2d3e4f5a6b';

    /** Builds a detached stream state, overriding only the fields under test. */
    const streamState = (overrides: Partial<StreamState> = {}): StreamState => ({
        events$: new Subject<SequencedLogEvent>(),
        pending: [],
        writing: [],
        writes: Promise.resolve(),
        producing: false,
        ...overrides,
    });

    /** Builds a sequenced line event. */
    const lineEvent = (seq: number): SequencedLogEvent => ({ seq, type: 'line', data: `line ${seq}` });

    let streams: StreamRegistry;

    /** Registry operations bound to the registry under test. */
    const acquire = (streamId: string, producing?: boolean): StreamState => (producing === undefined
        ? acquireStream(streams, streamId)
        : acquireStream(streams, streamId, producing));
    const get = (streamId: string): StreamState | undefined => getStream(streams, streamId);
    const entries = (): [string, StreamState][] => streamEntries(streams);
    const discard = (streamId: string, state: StreamState): void => discardStream(streams, streamId, state);
    const release = (streamId: string, state: StreamState): void => releaseStream(streams, streamId, state);

    beforeEach(() => {
        jest.clearAllMocks();

        streams = new Map<string, StreamState>();
    });

    describe('acquire', () => {
        it('creates an empty state on first use', () => {
            const state = acquire(id);

            expect(state.events$).toBeInstanceOf(Subject);
            expect(state.pending).toEqual([]);
            expect(state.writing).toEqual([]);
            expect(state.nextSeq).toBeUndefined();
            expect(state.seeded).toBeUndefined();
            expect(state.timer).toBeUndefined();
            expect(state.writes).toBeInstanceOf(Promise);
        });

        it('returns the very same state on a later acquire', () => {
            const first = acquire(id);
            const second = acquire(id);

            expect(second).toBe(first);
        });

        it('keeps one independent state per stream', () => {
            expect(acquire(id)).not.toBe(acquire(other));
        });

        it('marks the state as produced when acquired by a producer', () => {
            expect(acquire(id).producing).toBe(true);
        });

        it('never marks the state as produced when acquired by a subscriber only', () => {
            expect(acquire(id, false).producing).toBe(false);
        });

        it('keeps the producing flag set once a producer acquired the state', () => {
            acquire(id, true);

            expect(acquire(id, false).producing).toBe(true);
        });

        it('promotes a subscriber-created state once a producer acquires it', () => {
            const state = acquire(id, false);

            acquire(id, true);

            expect(state.producing).toBe(true);
        });
    });

    describe('get', () => {
        it('returns undefined when no state is held for the stream', () => {
            expect(get(id)).toBeUndefined();
        });

        it('returns the held state', () => {
            const state = acquire(id);

            expect(get(id)).toBe(state);
        });
    });

    describe('entries', () => {
        it('returns an empty list when nothing is held', () => {
            expect(entries()).toEqual([]);
        });

        it('returns every held stream paired with its identifier', () => {
            const first = acquire(id);
            const second = acquire(other);

            expect(entries()).toEqual([[id, first], [other, second]]);
        });

        it('returns a copy, so mutating it never touches the registry', () => {
            acquire(id);

            const held = entries();

            held.length = 0;

            expect(entries()).toHaveLength(1);
        });
    });

    describe('discard', () => {
        it('drops the state of the stream', () => {
            const state = acquire(id);

            discard(id, state);

            expect(get(id)).toBeUndefined();
        });

        it('never drops a state that already replaced the one being discarded', () => {
            const stale = acquire(id);

            discard(id, stale);

            const fresh = acquire(id);

            discard(id, stale);

            expect(get(id)).toBe(fresh);
        });

        it('ignores a state that the registry never held', () => {
            const held = acquire(id);

            discard(id, streamState());

            expect(get(id)).toBe(held);
        });
    });

    describe('release', () => {
        it('drops a state nothing produces into and nobody watches', () => {
            const state = acquire(id, false);

            release(id, state);

            expect(get(id)).toBeUndefined();
        });

        it('keeps a state a producer still owns', () => {
            const state = acquire(id, true);

            release(id, state);

            expect(get(id)).toBe(state);
        });

        it('keeps a state another subscriber still watches', () => {
            const state = acquire(id, false);
            const subscription = state.events$.subscribe();

            release(id, state);

            expect(get(id)).toBe(state);

            subscription.unsubscribe();
        });

        it('keeps a state whose batch is still buffered', () => {
            const state = acquire(id, false);

            state.pending.push(lineEvent(1));

            release(id, state);

            expect(get(id)).toBe(state);
        });

        it('keeps a state whose batch is still being written', () => {
            const state = acquire(id, false);

            state.writing.push(lineEvent(1));

            release(id, state);

            expect(get(id)).toBe(state);
        });

        it('drops the state once the last subscriber detached', () => {
            const state = acquire(id, false);
            const subscription = state.events$.subscribe();

            subscription.unsubscribe();
            release(id, state);

            expect(get(id)).toBeUndefined();
        });

        it('never drops a state that already replaced the one being released', () => {
            const stale = streamState();

            acquire(id, false);
            release(id, stale);

            expect(get(id)).toBeDefined();
        });
    });
});
