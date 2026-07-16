import { Log } from '../../domain/models/log.model';

import { LogDbEntity } from './log-db.entity';

/**
 * Maps a log database entity into its domain model.
 *
 * @param entity Log database entity
 *
 * @returns Domain log entry
 */
export function toLog(entity: LogDbEntity): Log {
    return {
        id: entity.id,
        deploymentId: entity.deploymentId,
        seq: entity.seq,
        type: entity.type,
        content: entity.content,
        status: entity.status,
        createdAt: entity.createdAt,
    };
}
