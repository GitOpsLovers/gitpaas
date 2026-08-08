import { CreateLogDto } from '../../domain/dtos/create-log.dto';
import { LogEntry } from '../../domain/models/log-entry.models';
import { LogEvent } from '../../domain/models/log-event.models';

/**
 * A log event carrying the monotonic sequence it was assigned on the write path.
 *
 * The sequence is what lets a subscriber stitch the historical replay and the
 * live feed together without a gap or a duplicate at the hand-off.
 */
export type SequencedLogEvent = { seq: number } & LogEvent;

/**
 * Drops the transport sequence, yielding the domain log event the SSE contract
 * exposes.
 *
 * @param event Sequenced log event
 *
 * @returns Domain log event
 */
export function toLogEvent(event: SequencedLogEvent): LogEvent {
    if (event.type === 'end') {
        return { type: 'end', status: event.status };
    }

    return { type: 'line', data: event.data };
}

/**
 * Maps a persisted log entry back into a sequenced log event so replayed rows
 * and live events share one shape.
 *
 * @param entry Persisted log entry
 *
 * @returns Sequenced log event
 */
export function toSequencedLogEvent(entry: LogEntry): SequencedLogEvent {
    if (entry.type === 'end') {
        return { seq: entry.seq, type: 'end', status: entry.status };
    }

    return { seq: entry.seq, type: 'line', data: entry.data };
}

/**
 * Turns a sequenced log event into the row that persists it, folding the event
 * variant onto the table's mutually-exclusive `content`/`status` columns.
 *
 * @param deploymentId Deployment identifier
 * @param event Sequenced log event
 *
 * @returns Create-log DTO ready to be written
 */
export function toCreateLogDto(deploymentId: string, event: SequencedLogEvent): CreateLogDto {
    if (event.type === 'end') {
        return {
            deploymentId, seq: event.seq, type: 'end', content: null, status: event.status,
        };
    }

    return {
        deploymentId, seq: event.seq, type: 'line', content: event.data, status: null,
    };
}
