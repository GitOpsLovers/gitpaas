import { Subscriber } from 'rxjs';

import { LOG_STREAM_UNAVAILABLE_CODE, LOG_STREAM_UNAVAILABLE_MESSAGE, LogEvent } from '../../domain/models/log-event.models';
import type { LogsRepository } from '../../domain/repositories/logs.repository';
import { toLogEventFromEntry } from '../database/db-log-store.transformer';

import {
    LOG_STORE_CONTEXT, LOG_STREAM_BLOCK_MS, LOG_STREAM_IDLE_ROUNDS_BEFORE_CLOSE,
    LOG_STREAM_READ_COUNT, LOG_STREAM_START_ID,
} from './redis-log-store.constants';
import { RedisStreamEntry, toLogEventFromFields, toLogStreamKey, toProducerLeaseKey } from './redis-log-store.transformer';

import type { AppLogger } from '@core/domain/ports/app-logger.port';
import { RedisConnection } from '@core/infrastructure/redis/redis.connection';

/**
 * How far one batch of entries carried the subscription along.
 */
interface StreamProgress {
    cursor: string;
    ended: boolean;
}

/**
 * Replays a deployment's archived log out of PostgreSQL, then completes.
 *
 * The fallback for a stream Redis no longer holds: the run is long over and its
 * whole output already sits in the cold archive.
 *
 * @param repository Logs repository
 * @param streamId Stream identifier
 * @param subscriber Subscriber to feed
 */
async function replayArchivedLog(
    repository: LogsRepository,
    streamId: string,
    subscriber: Subscriber<LogEvent>,
): Promise<void> {
    const entries = await repository.getAllByDeployment(streamId);

    for (const entry of entries) {
        subscriber.next(toLogEventFromEntry(entry));
    }

    subscriber.complete();
}

/**
 * Blocks on the dedicated blocking connection until the stream yields entries
 * past the cursor, or until the read times out.
 *
 * @param connection Redis connection
 * @param key Redis stream key
 * @param cursor Identifier the read starts after
 *
 * @returns Entries the round read, empty when the read timed out
 */
async function readNextEntries(
    connection: RedisConnection,
    key: string,
    cursor: string,
): Promise<RedisStreamEntry[]> {
    const reply = await connection.getBlockingClient().xread(
        'COUNT',
        LOG_STREAM_READ_COUNT,
        'BLOCK',
        LOG_STREAM_BLOCK_MS,
        'STREAMS',
        key,
        cursor,
    );

    return reply?.[0]?.[1] ?? [];
}

/**
 * Tells whether the producer of a stream still holds its lease.
 *
 * A dropped lease means the producer either finished or died: nothing more will
 * ever be appended, so the reader may close rather than leave the client waiting
 * for ever. The lease can be dropped just after a blocking read timed out, so
 * one idle round alone is not proof the stream is over.
 *
 * @param connection Redis connection
 * @param streamId Stream identifier
 *
 * @returns True when the producer lease is still held
 */
async function isProducerAlive(
    connection: RedisConnection,
    streamId: string,
): Promise<boolean> {
    const alive = await connection.getClient().exists(toProducerLeaseKey(streamId));

    return alive !== 0;
}

/**
 * Emits a batch of entries to the subscriber, stopping at the terminal one.
 *
 * The cursor advances to every entry read, including entries that carry no known
 * event, so an unreadable entry is never read twice. It stops advancing on the
 * terminal entry: whatever follows it belongs to no subscription.
 *
 * @param entries Stream entries, oldest first
 * @param subscriber Subscriber to feed
 *
 * @returns Cursor reached and whether the terminal entry was emitted
 */
function emitEntries(entries: RedisStreamEntry[], subscriber: Subscriber<LogEvent>): StreamProgress {
    let cursor = LOG_STREAM_START_ID;

    for (const [id, fields] of entries) {
        cursor = id;

        const event = toLogEventFromFields(fields);

        if (!event) {
            continue;
        }

        subscriber.next(event);

        if (event.type === 'end') {
            return { cursor, ended: true };
        }
    }

    return { cursor, ended: false };
}

/**
 * Follows a live Redis stream from its first entry to its terminal one.
 *
 * One cursor carries the whole subscription: the first read starts at `0`, so
 * the history arrives before the live tail on the very same cursor. There is no
 * replay/live hand-off to bridge and nothing to deduplicate.
 *
 * Every round blocks on the dedicated blocking connection, so no read ever
 * stalls the commands queued on the shared command connection.
 *
 * A stream whose producer never wrote its terminal entry still ends: idle rounds
 * that find no producer lease are counted, and the subscription closes once they
 * reach `LOG_STREAM_IDLE_ROUNDS_BEFORE_CLOSE`.
 *
 * @param connection Redis connection
 * @param streamId Stream identifier
 * @param subscriber Subscriber to feed
 * @param isCancelled Tells whether the subscriber went away
 */
async function followLogStream(
    connection: RedisConnection,
    streamId: string,
    subscriber: Subscriber<LogEvent>,
    isCancelled: () => boolean,
): Promise<void> {
    const key = toLogStreamKey(streamId);
    let cursor = LOG_STREAM_START_ID;
    let idleRounds = 0;

    while (!isCancelled()) {
        const entries = await readNextEntries(connection, key, cursor);

        if (isCancelled()) {
            return;
        }

        if (entries.length === 0) {
            idleRounds = await isProducerAlive(connection, streamId) ? 0 : idleRounds + 1;

            if (idleRounds >= LOG_STREAM_IDLE_ROUNDS_BEFORE_CLOSE) {
                subscriber.complete();

                return;
            }

            continue;
        }

        idleRounds = 0;

        const progress = emitEntries(entries, subscriber);

        cursor = progress.cursor;

        if (progress.ended) {
            subscriber.complete();

            return;
        }
    }
}

/**
 * Feeds one subscriber a deployment's log, live from Redis or replayed from the
 * archive when Redis no longer holds it.
 *
 * @param connection Redis connection
 * @param repository Logs repository
 * @param logger Application logger
 * @param streamId Stream identifier
 * @param subscriber Subscriber to feed
 * @param isCancelled Tells whether the subscriber went away
 */
export async function readLogStream(
    connection: RedisConnection,
    repository: LogsRepository,
    logger: AppLogger,
    streamId: string,
    subscriber: Subscriber<LogEvent>,
    isCancelled: () => boolean,
): Promise<void> {
    try {
        const exists = await connection.getClient().exists(toLogStreamKey(streamId));

        if (exists === 0) {
            await replayArchivedLog(repository, streamId, subscriber);

            return;
        }

        await followLogStream(connection, streamId, subscriber, isCancelled);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        logger.error(
            `Failed to stream the log of deployment ${streamId}: ${message}`,
            error,
            LOG_STORE_CONTEXT,
        );

        subscriber.next({
            type: 'error',
            code: LOG_STREAM_UNAVAILABLE_CODE,
            message: LOG_STREAM_UNAVAILABLE_MESSAGE,
        });

        subscriber.complete();
    }
}
