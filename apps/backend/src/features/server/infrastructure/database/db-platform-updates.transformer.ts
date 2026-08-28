import type { PlatformUpdate } from '@gitpaas/contracts';

import { DbPlatformUpdateEntity } from './db-platform-update.entity';

/**
 * Maps the row of an update of the platform into the update an answer of the API carries.
 *
 * @param entity Platform update database entity
 *
 * @returns The update of the platform
 */
export function toPlatformUpdate(entity: DbPlatformUpdateEntity): PlatformUpdate {
    return {
        id: entity.id,
        targetVersion: entity.targetVersion,
        step: entity.step,
        percent: entity.percent,
        state: entity.state,
        error: entity.error,
        startedAt: entity.startedAt.toISOString(),
    };
}
