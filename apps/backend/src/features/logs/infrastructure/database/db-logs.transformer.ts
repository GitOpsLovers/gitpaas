import { LogEntry } from '../../domain/models/log-entry.models';
import { LogStatus } from '../../domain/models/log-event.models';

import { DbLogEntity } from './db-log.entity';

/**
 * Maps a log database entity into its domain model, folding the row's
 * mutually-exclusive `content`/`status` columns onto the event variant its
 * `type` column selects.
 *
 * @param entity Log database entity
 *
 * @returns Domain log entry
 */
export function toLogEntry(entity: DbLogEntity): LogEntry {
    const metadata = {
        id: entity.id,
        deploymentId: entity.deploymentId,
        seq: entity.seq,
        createdAt: entity.createdAt,
    };

    if (entity.type === 'end') {
        return { ...metadata, type: 'end', status: entity.status as LogStatus };
    }

    return { ...metadata, type: 'line', data: entity.content ?? '' };
}
