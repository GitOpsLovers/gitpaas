import type { LogsRepository } from '../../domain/repositories/logs.repository';

import { BATCH_SIZE, FLUSH_INTERVAL_MS, LOG_STORE_CONTEXT } from './db-log-store.constants';
import { SequencedLogEvent, toCreateLogDto } from './db-log-store.transformer';
import { StreamState } from './db-log-stream-registry';
import { trimStream } from './db-log-trimmer';

import type { AppLogger } from '@core/domain/ports/app-logger.port';

/**
 * Persists one batch and applies the per-deployment line cap.
 *
 * Write failures are logged rather than thrown: losing a batch must not take the
 * run — or the write chain — down with it.
 *
 * @param repository Logs repository
 * @param logger Application logger
 * @param maxLines Upper bound on stored entries per deployment
 * @param streamId Stream identifier
 * @param batch Sequenced events to persist
 */
async function writeBatch(
    repository: LogsRepository,
    logger: AppLogger,
    maxLines: number,
    streamId: string,
    batch: SequencedLogEvent[],
): Promise<void> {
    try {
        await repository.createMany(batch.map((event) => toCreateLogDto(streamId, event)));

        const last = batch.at(-1);

        if (last) {
            await trimStream(repository, streamId, last.seq, maxLines);
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        logger.error(
            `Failed to persist ${batch.length} log entrie(s) for deployment ${streamId}: ${message}`,
            error,
            LOG_STORE_CONTEXT,
        );
    }
}

/**
 * Disarms a pending time-based flush.
 *
 * @param state Live state of the stream
 */
export function cancelFlush(state: StreamState): void {
    if (state.timer) {
        clearTimeout(state.timer);
        state.timer = undefined;
    }
}

/**
 * Writes the buffered batch out, keeping the batch visible to replaying
 * subscribers until the database confirms it.
 *
 * The batch holds captured events in memory and reaches the table on a size or
 * time trigger, so the table takes one write per batch rather than one per line.
 *
 * @param repository Logs repository
 * @param logger Application logger
 * @param maxLines Upper bound on stored entries per deployment
 * @param streamId Stream identifier
 * @param state Live state of the stream
 *
 * @returns Promise settling when every write queued so far has finished
 */
export function flushBatch(
    repository: LogsRepository,
    logger: AppLogger,
    maxLines: number,
    streamId: string,
    state: StreamState,
): Promise<void> {
    cancelFlush(state);

    if (state.pending.length === 0) {
        return state.writes;
    }

    const batch = state.pending.splice(0, state.pending.length);

    state.writing.push(...batch);

    state.writes = state.writes
        .then(() => writeBatch(repository, logger, maxLines, streamId, batch))
        .then(() => { state.writing.splice(0, batch.length); });

    return state.writes;
}

/**
 * Arms the time-based flush, unless one is already pending.
 *
 * @param repository Logs repository
 * @param logger Application logger
 * @param maxLines Upper bound on stored entries per deployment
 * @param streamId Stream identifier
 * @param state Live state of the stream
 */
function scheduleFlush(
    repository: LogsRepository,
    logger: AppLogger,
    maxLines: number,
    streamId: string,
    state: StreamState,
): void {
    if (state.timer) {
        return;
    }

    state.timer = setTimeout(
        () => { void flushBatch(repository, logger, maxLines, streamId, state); },
        FLUSH_INTERVAL_MS,
    );
    state.timer.unref();
}

/**
 * Applies the batching policy to a just-buffered event: write the batch out as
 * soon as it is full, otherwise arm the time-based flush.
 *
 * @param repository Logs repository
 * @param logger Application logger
 * @param maxLines Upper bound on stored entries per deployment
 * @param streamId Stream identifier
 * @param state Live state of the stream
 */
export async function commitBatch(
    repository: LogsRepository,
    logger: AppLogger,
    maxLines: number,
    streamId: string,
    state: StreamState,
): Promise<void> {
    if (state.pending.length >= BATCH_SIZE) {
        await flushBatch(repository, logger, maxLines, streamId, state);

        return;
    }

    scheduleFlush(repository, logger, maxLines, streamId, state);
}
