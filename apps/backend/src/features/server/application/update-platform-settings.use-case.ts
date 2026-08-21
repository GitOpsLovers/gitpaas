import type { PlatformSettings, UpdatePlatformSettingsDto } from '@gitpaas/contracts';
import { LOG_RETENTION_MAX_DAYS, LOG_RETENTION_MIN_DAYS } from '@gitpaas/contracts';

import { InvalidLogRetentionError } from '../domain/errors/server.errors';
import { PlatformSettingsRepository } from '../domain/repositories/platform-settings.repository';

/**
 * Use case for writing the parameters of the deployment system.
 *
 * @param settings Platform settings repository
 * @param updateDto Parameters to keep
 *
 * @returns Parameters the system keeps
 *
 * @throws InvalidLogRetentionError When the age falls outside the limits of the platform
 */
export async function updatePlatformSettingsUseCase(
    settings: PlatformSettingsRepository,
    updateDto: UpdatePlatformSettingsDto,
): Promise<PlatformSettings> {
    const { logRetentionDays } = updateDto;

    if (
        !Number.isInteger(logRetentionDays)
        || logRetentionDays < LOG_RETENTION_MIN_DAYS
        || logRetentionDays > LOG_RETENTION_MAX_DAYS
    ) {
        throw new InvalidLogRetentionError();
    }

    return settings.save({ logRetentionDays });
}
