import type { LogStatus, StoredLogEvent } from '@gitpaas/contracts';

import { CreateLogDto } from '../../domain/dtos/create-log.dto';
import { toCreateLogDto } from '../database/db-log-store.transformer';

import { LOG_STREAM_KEY_PREFIX, LOG_STREAM_PRODUCER_KEY_SUFFIX } from './redis-log-store.constants';

/**
 * One entry of a Redis stream: its identifier and its flat field/value list.
 */
export type RedisStreamEntry = [id: string, fields: string[]];

/**
 * Builds the Redis key holding a deployment's log stream.
 *
 * @param streamId Stream identifier
 *
 * @returns Redis stream key
 */
export function toLogStreamKey(streamId: string): string {
    return `${LOG_STREAM_KEY_PREFIX}${streamId}`;
}

/**
 * Builds the Redis key holding the lease a stream's producer keeps alive.
 *
 * @param streamId Stream identifier
 *
 * @returns Redis producer lease key
 */
export function toProducerLeaseKey(streamId: string): string {
    return `${toLogStreamKey(streamId)}${LOG_STREAM_PRODUCER_KEY_SUFFIX}`;
}

/**
 * Turns a log event into the flat field/value list one stream entry carries.
 *
 * @param event Stored log event
 *
 * @returns Field/value pairs ready for `XADD`
 */
export function toStreamFields(event: StoredLogEvent): string[] {
    if (event.type === 'end') {
        return ['type', 'end', 'status', event.status];
    }

    return ['type', 'line', 'content', event.data];
}

/**
 * Reads a stream entry's field/value list back into a log event.
 *
 * @param fields Field/value pairs of the entry
 *
 * @returns Stored log event, or null when the entry carries no known type
 */
export function toLogEventFromFields(fields: string[]): StoredLogEvent | null {
    const values = new Map<string, string>();

    for (let index = 0; index + 1 < fields.length; index += 2) {
        // eslint-disable-next-line security/detect-object-injection
        values.set(fields[index], fields[index + 1]);
    }

    const type = values.get('type');

    if (type === 'end') {
        return { type: 'end', status: values.get('status') as LogStatus };
    }

    if (type === 'line') {
        return { type: 'line', data: values.get('content') ?? '' };
    }

    return null;
}

/**
 * Turns a whole stream into the rows that archive it, numbering them from the
 * order Redis returned them in.
 *
 * The stream is the ordering authority: the `seq` column is the position of the
 * entry in the stream, starting at 1.
 *
 * @param streamId Stream identifier
 * @param entries Stream entries, oldest first
 *
 * @returns Create-log DTOs ready to be written, oldest first
 */
export function toCreateLogDtos(streamId: string, entries: RedisStreamEntry[]): CreateLogDto[] {
    const dtos: CreateLogDto[] = [];

    for (const [, fields] of entries) {
        const event = toLogEventFromFields(fields);

        if (event) {
            dtos.push(toCreateLogDto(streamId, { seq: dtos.length + 1, ...event }));
        }
    }

    return dtos;
}
