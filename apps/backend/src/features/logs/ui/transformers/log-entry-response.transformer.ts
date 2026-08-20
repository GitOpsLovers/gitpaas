import { LogEntry } from '../../domain/models/log-entry.models';
import { StoredLogEvent } from '../../domain/models/log-event.models';

/**
 * A log entry as an answer of the API carries it: every timestamp is a text of the ISO form.
 */
export type LogEntryResponse = {
    id: string;
    deploymentId: string;
    seq: number;
    createdAt: string;
} & StoredLogEvent;

/**
 * Maps a domain log entry into the shape an answer of the API carries.
 *
 * @param entry Domain log entry
 *
 * @returns Log entry of the wire
 */
export function toLogEntryResponse(entry: LogEntry): LogEntryResponse {
    const base = {
        id: entry.id,
        deploymentId: entry.deploymentId,
        seq: entry.seq,
        createdAt: entry.createdAt.toISOString(),
    };

    return entry.type === 'line'
        ? { ...base, type: 'line', data: entry.data }
        : { ...base, type: 'end', status: entry.status };
}
