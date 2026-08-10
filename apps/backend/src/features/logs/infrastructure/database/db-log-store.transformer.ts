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
 * Maps a persisted log entry into the domain log event the SSE contract
 * exposes, dropping the stored sequence, which only ordered the rows on the way
 * out of the database.
 *
 * @param entry Persisted log entry
 *
 * @returns Domain log event
 */
export function toLogEventFromEntry(entry: LogEntry): LogEvent {
    if (entry.type === 'end') {
        return { type: 'end', status: entry.status };
    }

    return { type: 'line', data: entry.data };
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
