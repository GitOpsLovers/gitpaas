import type {
    ArchivedLogEntry as LogEntryResponse,
    DeploymentLogArchive as LogArchiveResponse,
} from '@gitpaas/contracts';

import { LogArchive, LogEntry } from '../../domain/models/log-entry.models';

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

/**
 * Maps the durable list of the output of a deployment into the shape an answer of the API carries.
 *
 * @param archive Domain archive of a deployment
 *
 * @returns Durable list of the wire, with the reason an empty list is empty
 */
export function toLogArchiveResponse(archive: LogArchive): LogArchiveResponse {
    return {
        state: archive.state,
        entries: archive.entries.map(toLogEntryResponse),
    };
}
