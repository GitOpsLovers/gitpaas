import type { PlatformSettings, UpdatePlatformSettingsDto } from '@gitpaas/contracts';
import {
    DOMAIN_HOST_MAX_LENGTH,
    DOMAIN_HOST_PATTERN,
    LOG_RETENTION_MAX_DAYS,
    LOG_RETENTION_MIN_DAYS,
} from '@gitpaas/contracts';

import { InvalidGitpaasDomainError, InvalidLogRetentionError } from '../domain/errors/server.errors';
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
 * @throws InvalidGitpaasDomainError When the host of the control plane breaks the rule of a host name
 */
export async function updatePlatformSettingsUseCase(
    settings: PlatformSettingsRepository,
    updateDto: UpdatePlatformSettingsDto,
): Promise<PlatformSettings> {
    const { gitpaasDomain, logRetentionDays } = updateDto;

    if (
        !Number.isInteger(logRetentionDays)
        || logRetentionDays < LOG_RETENTION_MIN_DAYS
        || logRetentionDays > LOG_RETENTION_MAX_DAYS
    ) {
        throw new InvalidLogRetentionError();
    }

    if (
        gitpaasDomain !== undefined
        && (gitpaasDomain.length > DOMAIN_HOST_MAX_LENGTH || !DOMAIN_HOST_PATTERN.test(gitpaasDomain))
    ) {
        throw new InvalidGitpaasDomainError();
    }

    return settings.save({ logRetentionDays, gitpaasDomain });
}
