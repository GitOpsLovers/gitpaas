import { Subject } from 'rxjs';

import { SequencedLogEvent } from '../db-log-store.transformer';
import { LogStreamRegistry, StreamState } from '../db-log-stream-registry';

describe('LogStreamRegistry', () => {
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

    let sut: LogStreamRegistry;

    beforeEach(() => {
        jest.clearAllMocks();

        sut = new LogStreamRegistry();
    });

    describe('acquire', () => {
        it('creates an empty state on first use', () => {
            const state = sut.acquire(id);

            expect(state.events$).toBeInstanceOf(Subject);
            expect(state.pending).toEqual([]);
            expect(state.writing).toEqual([]);
            expect(state.nextSeq).toBeUndefined();
            expect(state.seeded).toBeUndefined();
            expect(state.timer).toBeUndefined();
            expect(state.writes).toBeInstanceOf(Promise);
        });

        it('returns the very same state on a later acquire', () => {
            const first = sut.acquire(id);
            const second = sut.acquire(id);

            expect(second).toBe(first);
        });

        it('keeps one independent state per stream', () => {
            expect(sut.acquire(id)).not.toBe(sut.acquire(other));
        });

        it('marks the state as produced when acquired by a producer', () => {
            expect(sut.acquire(id).producing).toBe(true);
        });

        it('never marks the state as produced when acquired by a subscriber only', () => {
            expect(sut.acquire(id, false).producing).toBe(false);
        });

        it('keeps the producing flag set once a producer acquired the state', () => {
            sut.acquire(id, true);

            expect(sut.acquire(id, false).producing).toBe(true);
        });

        it('promotes a subscriber-created state once a producer acquires it', () => {
            const state = sut.acquire(id, false);

            sut.acquire(id, true);

            expect(state.producing).toBe(true);
        });
    });

    describe('get', () => {
        it('returns undefined when no state is held for the stream', () => {
            expect(sut.get(id)).toBeUndefined();
        });

        it('returns the held state', () => {
            const state = sut.acquire(id);

            expect(sut.get(id)).toBe(state);
        });
    });

    describe('entries', () => {
        it('returns an empty list when nothing is held', () => {
            expect(sut.entries()).toEqual([]);
        });

        it('returns every held stream paired with its identifier', () => {
            const first = sut.acquire(id);
            const second = sut.acquire(other);

            expect(sut.entries()).toEqual([[id, first], [other, second]]);
        });

        it('returns a copy, so mutating it never touches the registry', () => {
            sut.acquire(id);

            const entries = sut.entries();

            entries.length = 0;

            expect(sut.entries()).toHaveLength(1);
        });
    });

    describe('discard', () => {
        it('drops the state of the stream', () => {
            const state = sut.acquire(id);

            sut.discard(id, state);

            expect(sut.get(id)).toBeUndefined();
        });

        it('never drops a state that already replaced the one being discarded', () => {
            const stale = sut.acquire(id);

            sut.discard(id, stale);

            const fresh = sut.acquire(id);

            sut.discard(id, stale);

            expect(sut.get(id)).toBe(fresh);
        });

        it('ignores a state that the registry never held', () => {
            const held = sut.acquire(id);

            sut.discard(id, streamState());

            expect(sut.get(id)).toBe(held);
        });
    });

    describe('release', () => {
        it('drops a state nothing produces into and nobody watches', () => {
            const state = sut.acquire(id, false);

            sut.release(id, state);

            expect(sut.get(id)).toBeUndefined();
        });

        it('keeps a state a producer still owns', () => {
            const state = sut.acquire(id, true);

            sut.release(id, state);

            expect(sut.get(id)).toBe(state);
        });

        it('keeps a state another subscriber still watches', () => {
            const state = sut.acquire(id, false);
            const subscription = state.events$.subscribe();

            sut.release(id, state);

            expect(sut.get(id)).toBe(state);

            subscription.unsubscribe();
        });

        it('keeps a state whose batch is still buffered', () => {
            const state = sut.acquire(id, false);

            state.pending.push(lineEvent(1));

            sut.release(id, state);

            expect(sut.get(id)).toBe(state);
        });

        it('keeps a state whose batch is still being written', () => {
            const state = sut.acquire(id, false);

            state.writing.push(lineEvent(1));

            sut.release(id, state);

            expect(sut.get(id)).toBe(state);
        });

        it('drops the state once the last subscriber detached', () => {
            const state = sut.acquire(id, false);
            const subscription = state.events$.subscribe();

            subscription.unsubscribe();
            sut.release(id, state);

            expect(sut.get(id)).toBeUndefined();
        });

        it('never drops a state that already replaced the one being released', () => {
            const stale = streamState();

            sut.acquire(id, false);
            sut.release(id, stale);

            expect(sut.get(id)).toBeDefined();
        });
    });
});
