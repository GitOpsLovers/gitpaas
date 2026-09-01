import type { PlatformSettings, UpdatePlatformSettingsDto } from '@gitpaas/contracts';
import {
    DOMAIN_HOST_MAX_LENGTH,
    DOMAIN_HOST_PATTERN,
    LOG_RETENTION_MAX_DAYS,
    LOG_RETENTION_MIN_DAYS,
} from '@gitpaas/contracts';

import { CONTROL_PLANE_ENV_PATH } from '../domain/constants/platform-settings.constants';
import {
    ControlPlaneEnvWriteError,
    GitpaasDomainNotPointingAtHostError,
    HostAddressUnknownError,
    InvalidGitpaasDomainError,
    InvalidLogRetentionError,
} from '../domain/errors/server.errors';
import type { ControlPlaneEnvFile } from '../domain/ports/control-plane-env-file.port';
import type { DnsResolver } from '../domain/ports/dns-resolver.port';
import type { PublicHostAddress } from '../domain/ports/public-host-address.port';
import { PlatformSettingsRepository } from '../domain/repositories/platform-settings.repository';

import { checkControlPlaneDomainUseCase } from './check-control-plane-domain.use-case';

/**
 * Use case for writing the parameters of the deployment system.
 *
 * @param settings Platform settings repository
 * @param dns Resolver of the public DNS
 * @param publicAddress Source of the public address of this host
 * @param envFile Writer of the environment of the stack
 * @param updateDto Parameters to keep
 *
 * @returns Parameters the system keeps
 *
 * @throws InvalidLogRetentionError When the age falls outside the limits of the platform
 * @throws InvalidGitpaasDomainError When the host of the control plane breaks the rule of a host name
 * @throws HostAddressUnknownError When the public address of this host cannot be read
 * @throws GitpaasDomainNotPointingAtHostError When the host of the control plane resolves elsewhere
 * @throws ControlPlaneEnvWriteError When the row is kept and the environment of the stack refuses the write
 */
export async function updatePlatformSettingsUseCase(
    settings: PlatformSettingsRepository,
    dns: DnsResolver,
    publicAddress: PublicHostAddress,
    envFile: ControlPlaneEnvFile,
    updateDto: UpdatePlatformSettingsDto,
): Promise<PlatformSettings> {
    const { gitpaasDomain, logRetentionDays, publicHostAddress } = updateDto;

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

    if (gitpaasDomain !== undefined) {
        const check = await checkControlPlaneDomainUseCase(dns, publicAddress, gitpaasDomain);

        if (check.hostAddress === null) {
            throw new HostAddressUnknownError();
        }

        if (!check.pointsAtHost) {
            throw new GitpaasDomainNotPointingAtHostError(
                check.host,
                check.resolvedAddresses,
                check.hostAddress,
            );
        }
    }

    const saved = await settings.save({ logRetentionDays, gitpaasDomain, publicHostAddress });

    if (gitpaasDomain !== undefined) {
        try {
            await envFile.writeDomain(gitpaasDomain);
        } catch (error) {
            throw new ControlPlaneEnvWriteError(CONTROL_PLANE_ENV_PATH, { cause: error });
        }
    }

    return saved;
}
