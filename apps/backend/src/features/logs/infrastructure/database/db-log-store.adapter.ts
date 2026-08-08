import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, Subject } from 'rxjs';

import { LogEvent, LogStatus } from '../../domain/models/log-event.models';
import { LogStore } from '../../domain/ports/log-store.port';
import type { LogsRepository } from '../../domain/repositories/logs.repository';

import {
    SequencedLogEvent, toCreateLogDto, toLogEvent, toSequencedLogEvent,
} from './db-log-store.transformer';
import { DatabaseLogsRepository } from './db-logs.repository';

import { DiagnosticLoggerService } from '@core/ui/services/diagnostic-logger.service';

/** Lines buffered before the batch is written out, whatever the timer says. */
const BATCH_SIZE = 100;

/** Upper bound on how long a captured line may sit in memory before it is durable. */
const FLUSH_INTERVAL_MS = 250;

/** Milliseconds in an hour, used to turn the configured retention into an instant. */
const HOUR_IN_MS = 60 * 60 * 1000;

/**
 * Everything the adapter keeps in memory for one deployment's stream.
 */
interface StreamState {
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
 * Database log store adapter.
 *
 * The live {@link LogStore}: captured lines are batched into the `logs` table
 * and fanned out in-process over an RxJS subject, so history survives a crash
 * and has no expiry, while subscribers still see output as it happens.
 *
 * A subscriber is served *replay then live*: it attaches to the subject first,
 * then reads the deployment's stored rows plus the still-unwritten batch, and
 * deduplicates the overlap by sequence. Because the subject is attached before
 * the read and the in-memory batch is snapshotted before it too, nothing can
 * slip between the two sources — the hand-off has neither a gap nor a duplicate.
 *
 * Sequences are the single ordering authority: one monotonic counter per
 * deployment, seeded from the highest stored sequence and handed out on the
 * write path, shared by the persisted rows and the live events.
 */
@Injectable()
export class DatabaseLogStoreAdapter implements LogStore, OnModuleDestroy {
    /** Per-deployment live state, present only while a stream is produced or watched. */
    private readonly streams = new Map<string, StreamState>();

    /** Age after which stored log entries are dropped. */
    private readonly retentionHours: number;

    /** Upper bound on stored entries per deployment; older ones are dropped. */
    private readonly maxLines: number;

    constructor(
        @Inject(DatabaseLogsRepository)
        private readonly repository: LogsRepository,
        private readonly diagnostics: DiagnosticLoggerService,
        config: ConfigService,
    ) {
        this.retentionHours = config.getOrThrow<number>('LOGS_RETENTION_HOURS');
        this.maxLines = config.getOrThrow<number>('LOGS_MAX_LINES');
    }

    /**
     * Append a captured log line: batch it for the database and publish it live.
     *
     * Never rejects. Appends are driven fire-and-forget from the Docker stream
     * callback, so a store hiccup is logged and the line dropped rather than
     * escaping as an unhandled rejection that would take the process down.
     *
     * @param streamId Stream identifier
     * @param line Raw log line
     */
    public async append(streamId: string, line: string): Promise<void> {
        try {
            const state = this.acquire(streamId);
            const seq = await this.takeSeq(streamId, state);
            const event: SequencedLogEvent = { seq, type: 'line', data: line };

            state.pending.push(event);
            state.events$.next(event);

            if (state.pending.length >= BATCH_SIZE) {
                await this.flush(streamId, state);

                return;
            }

            this.scheduleFlush(streamId, state);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);

            this.diagnostics.error(
                `Failed to append a log line for deployment ${streamId}: ${message}`,
                error,
                DatabaseLogStoreAdapter.name,
            );
        }
    }

    /**
     * Mark a stream as finished: flush the batch, persist the terminal entry and
     * publish it so every subscriber's stream closes.
     *
     * @param streamId Stream identifier
     * @param status Terminal status of the stream
     */
    public async complete(streamId: string, status: LogStatus): Promise<void> {
        const state = this.acquire(streamId);
        const seq = await this.takeSeq(streamId, state);
        const event: SequencedLogEvent = { seq, type: 'end', status };

        state.pending.push(event);

        // Persist before publishing: a subscriber that joins in between still
        // finds the terminal entry in its replay, so it can never hang.
        await this.flush(streamId, state);

        state.producing = false;
        state.events$.next(event);
        state.events$.complete();

        if (this.streams.get(streamId) === state) {
            this.streams.delete(streamId);
        }

        await this.enforceRetention();
    }

    /**
     * Stream a log: stored entries first, then live ones, completing on the
     * terminal `end` event.
     *
     * @param streamId Stream identifier
     *
     * @returns Cold observable of the stream's log events
     */
    public stream(streamId: string): Observable<LogEvent> {
        return new Observable<LogEvent>((subscriber) => {
            const state = this.acquire(streamId, false);

            let replaying = true;
            let ended = false;
            let liveEnded = false;
            let maxSeq = 0;
            const buffered: SequencedLogEvent[] = [];

            const emit = (event: SequencedLogEvent): void => {
                // Drop anything already emitted (replay/live overlap) or out of order.
                if (ended || event.seq <= maxSeq) {
                    return;
                }

                maxSeq = event.seq;

                const logEvent = toLogEvent(event);

                subscriber.next(logEvent);

                if (logEvent.type === 'end') {
                    ended = true;
                    subscriber.complete();
                }
            };

            // Attach live *before* reading history: anything published from now on is
            // held back until the replay drains, so no event can fall between them.
            const live = state.events$.subscribe({
                next: (event: SequencedLogEvent) => {
                    if (replaying) {
                        buffered.push(event);

                        return;
                    }

                    emit(event);
                },
                error: (error: unknown) => { subscriber.error(error); },
                complete: () => {
                    liveEnded = true;

                    if (!replaying && !ended) {
                        subscriber.complete();
                    }
                },
            });

            // Snapshot the not-yet-durable events before querying: rows that become
            // durable during the query are simply seen twice and deduplicated.
            const unflushed = [...state.writing, ...state.pending];

            this.repository
                .getAllByDeployment(streamId)
                .then((entries) => {
                    entries.map(toSequencedLogEvent).forEach(emit);
                    unflushed.forEach(emit);

                    replaying = false;
                    buffered.forEach(emit);
                    buffered.length = 0;

                    if (liveEnded && !ended) {
                        subscriber.complete();
                    }
                })
                .catch((error: unknown) => { subscriber.error(error); });

            return () => {
                live.unsubscribe();
                this.release(streamId, state);
            };
        });
    }

    /**
     * Remove a stream's stored entries and drop its in-memory state.
     *
     * @param streamId Stream identifier
     */
    public async purge(streamId: string): Promise<void> {
        const state = this.streams.get(streamId);

        if (state) {
            this.cancelFlush(state);
            state.pending.length = 0;
            state.producing = false;
            state.events$.complete();
            this.streams.delete(streamId);

            // Let any write already handed to the database settle, so it cannot
            // re-insert rows behind the delete.
            await state.writes;
        }

        await this.repository.deleteByDeployment(streamId);
    }

    /**
     * Flush every buffered batch when the application shuts down, so a graceful
     * stop loses nothing.
     */
    public async onModuleDestroy(): Promise<void> {
        const flushes = [...this.streams.entries()].map(([streamId, state]) => this.flush(streamId, state));

        await Promise.all(flushes);
    }

    /**
     * Returns the live state for a stream, creating it on first use.
     *
     * @param streamId Stream identifier
     * @param producing Whether the caller is a producer, which pins the state in memory
     *
     * @returns Live state of the stream
     */
    private acquire(streamId: string, producing = true): StreamState {
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
     * Drops a stream's state once nothing produces into it and nobody watches it.
     *
     * @param streamId Stream identifier
     * @param state Live state of the stream
     */
    private release(streamId: string, state: StreamState): void {
        const idle = !state.producing
            && !state.events$.observed
            && state.pending.length === 0
            && state.writing.length === 0;

        if (idle && this.streams.get(streamId) === state) {
            this.streams.delete(streamId);
        }
    }

    /**
     * Hands out the next sequence of a deployment's single sequence space,
     * seeding the counter from the highest stored sequence on first use.
     *
     * @param streamId Stream identifier
     * @param state Live state of the stream
     *
     * @returns Sequence assigned to the caller's event
     */
    private async takeSeq(streamId: string, state: StreamState): Promise<number> {
        state.seeded ??= this.repository.getMaxSeq(streamId);

        const highest = await state.seeded;

        state.nextSeq ??= highest + 1;

        const seq = state.nextSeq;

        state.nextSeq = seq + 1;

        return seq;
    }

    /**
     * Arms the time-based flush, unless one is already pending.
     *
     * @param streamId Stream identifier
     * @param state Live state of the stream
     */
    private scheduleFlush(streamId: string, state: StreamState): void {
        if (state.timer) {
            return;
        }

        state.timer = setTimeout(() => { void this.flush(streamId, state); }, FLUSH_INTERVAL_MS);
        state.timer.unref();
    }

    /**
     * Disarms a pending time-based flush.
     *
     * @param state Live state of the stream
     */
    private cancelFlush(state: StreamState): void {
        if (state.timer) {
            clearTimeout(state.timer);
            state.timer = undefined;
        }
    }

    /**
     * Writes the buffered batch out, keeping the batch visible to replaying
     * subscribers until the database confirms it.
     *
     * @param streamId Stream identifier
     * @param state Live state of the stream
     *
     * @returns Promise settling when every write queued so far has finished
     */
    private flush(streamId: string, state: StreamState): Promise<void> {
        this.cancelFlush(state);

        if (state.pending.length === 0) {
            return state.writes;
        }

        const batch = state.pending.splice(0, state.pending.length);

        state.writing.push(...batch);

        state.writes = state.writes
            .then(() => this.write(streamId, batch))
            .then(() => { state.writing.splice(0, batch.length); });

        return state.writes;
    }

    /**
     * Persists one batch and applies the per-deployment line cap.
     *
     * Write failures are logged rather than thrown: losing a batch must not take
     * the run — or the write chain — down with it.
     *
     * @param streamId Stream identifier
     * @param batch Sequenced events to persist
     */
    private async write(streamId: string, batch: SequencedLogEvent[]): Promise<void> {
        try {
            await this.repository.createMany(batch.map((event) => toCreateLogDto(streamId, event)));

            const last = batch.at(-1);

            if (last) {
                await this.trim(streamId, last.seq);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);

            this.diagnostics.error(
                `Failed to persist ${batch.length} log entrie(s) for deployment ${streamId}: ${message}`,
                error,
                DatabaseLogStoreAdapter.name,
            );
        }
    }

    /**
     * Enforces the per-deployment line cap by dropping the oldest entries.
     *
     * @param streamId Stream identifier
     * @param lastSeq Highest sequence written so far
     */
    private async trim(streamId: string, lastSeq: number): Promise<void> {
        if (this.maxLines <= 0 || lastSeq <= this.maxLines) {
            return;
        }

        await this.repository.deleteUpToSeq(streamId, lastSeq - this.maxLines);
    }

    /**
     * Enforces the age-based retention window.
     *
     * Runs opportunistically when a run completes: the backend ships no
     * scheduler, so completion is the cheapest recurring hook available.
     */
    private async enforceRetention(): Promise<void> {
        if (this.retentionHours <= 0) {
            return;
        }

        try {
            await this.repository.deleteCreatedBefore(new Date(Date.now() - (this.retentionHours * HOUR_IN_MS)));
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);

            this.diagnostics.error(
                `Failed to enforce log retention: ${message}`,
                error,
                DatabaseLogStoreAdapter.name,
            );
        }
    }
}
