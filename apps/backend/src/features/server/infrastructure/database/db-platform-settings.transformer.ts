import type { PlatformSettings } from '@gitpaas/contracts';

import { DbPlatformSettingsEntity } from './db-platform-settings.entity';

/**
 * Maps the row of the settings into the parameters of the deployment system.
 *
 * @param entity Platform settings database entity
 *
 * @returns Parameters of the deployment system
 */
export function toPlatformSettings(entity: DbPlatformSettingsEntity): PlatformSettings {
    return {
        logRetentionDays: entity.logRetentionDays,
        gitpaasDomain: entity.gitpaasDomain ?? undefined,
        publicHostAddress: entity.publicHostAddress ?? undefined,
    };
}
