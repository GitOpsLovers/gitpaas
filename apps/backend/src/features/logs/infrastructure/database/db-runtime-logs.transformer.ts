import { RuntimeLogEntry } from '../../domain/models/runtime-log.models';

import { DbRuntimeLogEntity } from './db-runtime-log.entity';

/**
 * Maps a runtime log database entity into its domain model, keeping the row's free-text
 * `source` column inside the two streams a container writes to.
 *
 * @param entity Runtime log database entity
 *
 * @returns Domain runtime log entry
 */
export function toRuntimeLogEntry(entity: DbRuntimeLogEntity): RuntimeLogEntry {
    return {
        id: entity.id,
        containerId: entity.containerId,
        timestamp: entity.timestamp,
        source: entity.source === 'stderr' ? 'stderr' : 'stdout',
        text: entity.text,
        createdAt: entity.createdAt,
    };
}
