import { Inject, Injectable } from '@nestjs/common';

import type { LogsRepository } from '../../domain/repositories/logs.repository';

import { BATCH_SIZE, FLUSH_INTERVAL_MS, LOG_STORE_CONTEXT } from './db-log-store.constants';
import { SequencedLogEvent, toCreateLogDto } from './db-log-store.transformer';
import { StreamState } from './db-log-stream-registry';
import { LogTrimmer } from './db-log-trimmer';
import { DatabaseLogsRepository } from './db-logs.repository';

import type { AppLogger } from '@core/domain/ports/app-logger.port';
import { NestLoggerAdapter } from '@core/infrastructure/logging/nest-logger.adapter';

/**
 * Write batcher of a deployment's log stream.
 *
 * Holds captured events in memory and writes them out on a size or time
 * trigger, so the table takes one write per batch rather than one per line,
 * while the batch stays visible to a replaying subscriber until it is durable.
 */
@Injectable()
export class LogBatcher {
    constructor(
        @Inject(DatabaseLogsRepository)
        private readonly repository: LogsRepository,
        @Inject(NestLoggerAdapter)
        private readonly logger: AppLogger,
        private readonly trimmer: LogTrimmer,
    ) {}

    /**
     * Applies the batching policy to a just-buffered event: write the batch out
     * as soon as it is full, otherwise arm the time-based flush.
     *
     * @param streamId Stream identifier
     * @param state Live state of the stream
     */
    public async commit(streamId: string, state: StreamState): Promise<void> {
        if (state.pending.length >= BATCH_SIZE) {
            await this.flush(streamId, state);

            return;
        }

        this.schedule(streamId, state);
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
    public flush(streamId: string, state: StreamState): Promise<void> {
        this.cancel(state);

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
     * Disarms a pending time-based flush.
     *
     * @param state Live state of the stream
     */
    public cancel(state: StreamState): void {
        if (state.timer) {
            clearTimeout(state.timer);
            state.timer = undefined;
        }
    }

    /**
     * Arms the time-based flush, unless one is already pending.
     *
     * @param streamId Stream identifier
     * @param state Live state of the stream
     */
    private schedule(streamId: string, state: StreamState): void {
        if (state.timer) {
            return;
        }

        state.timer = setTimeout(() => { void this.flush(streamId, state); }, FLUSH_INTERVAL_MS);
        state.timer.unref();
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
                await this.trimmer.trim(streamId, last.seq);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);

            this.logger.error(
                `Failed to persist ${batch.length} log entrie(s) for deployment ${streamId}: ${message}`,
                error,
                LOG_STORE_CONTEXT,
            );
        }
    }
}
