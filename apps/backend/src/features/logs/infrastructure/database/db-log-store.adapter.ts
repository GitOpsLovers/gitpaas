import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';

import { LogEvent, LogStatus } from '../../domain/models/log-event.models';
import { LogStore } from '../../domain/ports/log-store.port';
import type { LogsRepository } from '../../domain/repositories/logs.repository';

import { cancelFlush, commitBatch, flushBatch } from './db-log-batcher';
import { mergeReplayWithLive } from './db-log-replay-merger';
import { sweepRetention } from './db-log-retention-sweeper';
import { nextSequence } from './db-log-sequencer';
import { LOG_STORE_CONTEXT } from './db-log-store.constants';
import { SequencedLogEvent } from './db-log-store.transformer';
import {
    acquireStream, discardStream, getStream, releaseStream, StreamRegistry, streamEntries,
} from './db-log-stream-registry';
import { DatabaseLogsRepository } from './db-logs.repository';

import type { AppLogger } from '@core/domain/ports/app-logger.port';
import { NestLoggerAdapter } from '@core/infrastructure/logging/nest-logger.adapter';

/**
 * Database log store adapter.
 *
 * The live {@link LogStore}: captured lines are batched into the `logs` table
 * and fanned out in-process over an RxJS subject, so history survives a crash
 * and has no expiry, while subscribers still see output as it happens.
 *
 * The adapter is the composition point only. Each concern lives in its own
 * module of plain functions: the stream registry keeps the per-deployment state
 * the adapter owns, the sequencer the ordering, the batcher the durable writes,
 * the replay merger the replay/live hand-off, and the trimmer plus the retention
 * sweeper the two retention limits.
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
    private readonly streams: StreamRegistry = new Map();

    /** Upper bound on stored entries per deployment; older ones are dropped. */
    private readonly maxLines: number;

    /** Age after which stored log entries are dropped. */
    private readonly retentionHours: number;

    constructor(
        @Inject(DatabaseLogsRepository)
        private readonly repository: LogsRepository,
        @Inject(NestLoggerAdapter)
        private readonly logger: AppLogger,
        config: ConfigService,
    ) {
        this.maxLines = config.getOrThrow<number>('LOGS_MAX_LINES');
        this.retentionHours = config.getOrThrow<number>('LOGS_RETENTION_HOURS');
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
            const state = acquireStream(this.streams, streamId);
            const seq = await nextSequence(this.repository, streamId, state);
            const event: SequencedLogEvent = { seq, type: 'line', data: line };

            state.pending.push(event);
            state.events$.next(event);

            await commitBatch(this.repository, this.logger, this.maxLines, streamId, state);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);

            this.logger.error(
                `Failed to append a log line for deployment ${streamId}: ${message}`,
                error,
                LOG_STORE_CONTEXT,
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
        const state = acquireStream(this.streams, streamId);
        const seq = await nextSequence(this.repository, streamId, state);
        const event: SequencedLogEvent = { seq, type: 'end', status };

        state.pending.push(event);

        // Persist before publishing: a subscriber that joins in between still
        // finds the terminal entry in its replay, so it can never hang.
        await flushBatch(this.repository, this.logger, this.maxLines, streamId, state);

        state.producing = false;
        state.events$.next(event);
        state.events$.complete();

        discardStream(this.streams, streamId, state);

        await sweepRetention(this.repository, this.logger, this.retentionHours);
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
            const state = acquireStream(this.streams, streamId, false);
            const detach = mergeReplayWithLive(this.repository, streamId, state, subscriber);

            return () => {
                detach();
                releaseStream(this.streams, streamId, state);
            };
        });
    }

    /**
     * Remove a stream's stored entries and drop its in-memory state.
     *
     * @param streamId Stream identifier
     */
    public async purge(streamId: string): Promise<void> {
        const state = getStream(this.streams, streamId);

        if (state) {
            cancelFlush(state);
            state.pending.length = 0;
            state.producing = false;
            state.events$.complete();
            discardStream(this.streams, streamId, state);

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
        const flushes = streamEntries(this.streams).map(
            ([streamId, state]) => flushBatch(this.repository, this.logger, this.maxLines, streamId, state),
        );

        await Promise.all(flushes);
    }
}
