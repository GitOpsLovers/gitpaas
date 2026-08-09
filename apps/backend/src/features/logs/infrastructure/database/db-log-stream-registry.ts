import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';

import { SequencedLogEvent } from './db-log-store.transformer';

/**
 * Everything the store keeps in memory for one deployment's stream.
 */
export interface StreamState {
    /** Live fan-out to every in-process subscriber of this deployment. */
    events$: Subject<SequencedLogEvent>;
    /** Captured events not handed to the database yet. */
    pending: SequencedLogEvent[];
    /** Captured events handed to the database but not confirmed written yet. */
    writing: SequencedLogEvent[];
    /** Next sequence to hand out; undefined until seeded from the database. */
    nextSeq?: number;
    /** In-flight (or settled) seed query for the deployment's highest stored sequence. */
    seeded?: Promise<number>;
    /** Pending time-based flush, if one is armed. */
    timer?: NodeJS.Timeout;
    /** Serializes writes so batches reach the table in sequence order. */
    writes: Promise<void>;
    /** True once a run started producing into this stream. */
    producing: boolean;
}

/**
 * Registry of the per-deployment live state.
 *
 * Owns the lifecycle of a stream's in-memory state: it exists from the first
 * producer or subscriber until nothing produces into it and nobody watches it.
 */
@Injectable()
export class LogStreamRegistry {
    /** Per-deployment live state, present only while a stream is produced or watched. */
    private readonly streams = new Map<string, StreamState>();

    /**
     * Returns the live state for a stream, creating it on first use.
     *
     * @param streamId Stream identifier
     * @param producing Whether the caller is a producer, which pins the state in memory
     *
     * @returns Live state of the stream
     */
    public acquire(streamId: string, producing = true): StreamState {
        let state = this.streams.get(streamId);

        if (!state) {
            state = {
                events$: new Subject<SequencedLogEvent>(),
                pending: [],
                writing: [],
                writes: Promise.resolve(),
                producing: false,
            };

            this.streams.set(streamId, state);
        }

        state.producing ||= producing;

        return state;
    }

    /**
     * Returns the live state of a stream, if one is held.
     *
     * @param streamId Stream identifier
     *
     * @returns Live state of the stream, or undefined when none is held
     */
    public get(streamId: string): StreamState | undefined {
        return this.streams.get(streamId);
    }

    /**
     * Returns every stream currently held, paired with its identifier.
     *
     * @returns Held streams as `[streamId, state]` pairs
     */
    public entries(): [string, StreamState][] {
        return [...this.streams.entries()];
    }

    /**
     * Drops a stream's state, unless another state already replaced it.
     *
     * @param streamId Stream identifier
     * @param state Live state of the stream
     */
    public discard(streamId: string, state: StreamState): void {
        if (this.streams.get(streamId) === state) {
            this.streams.delete(streamId);
        }
    }

    /**
     * Drops a stream's state once nothing produces into it and nobody watches it.
     *
     * @param streamId Stream identifier
     * @param state Live state of the stream
     */
    public release(streamId: string, state: StreamState): void {
        const idle = !state.producing
            && !state.events$.observed
            && state.pending.length === 0
            && state.writing.length === 0;

        if (idle) {
            this.discard(streamId, state);
        }
    }
}
