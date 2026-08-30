import type { PlatformSettings } from '@gitpaas/contracts';

import { DEFAULT_LOG_RETENTION_DAYS } from '../domain/constants/platform-settings.constants';
import { PlatformSettingsRepository } from '../domain/repositories/platform-settings.repository';

/**
 * Use case for reading the parameters of the deployment system.
 *
 * @param settings Platform settings repository
 *
 * @returns Parameters of the deployment system
 */
export async function getPlatformSettingsUseCase(settings: PlatformSettingsRepository): Promise<PlatformSettings> {
    const saved = await settings.find();

    return {
        logRetentionDays: saved?.logRetentionDays ?? DEFAULT_LOG_RETENTION_DAYS,
        gitpaasDomain: saved?.gitpaasDomain,
    };
}
