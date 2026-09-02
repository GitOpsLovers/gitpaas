import type {
    ControlPlaneDomainWarning,
    UpdatePlatformSettingsDto,
    UpdatePlatformSettingsResult,
} from '@gitpaas/contracts';
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
import type { CloudflareRanges } from '../domain/ports/cloudflare-ranges.port';
import type { ControlPlaneEnvFile } from '../domain/ports/control-plane-env-file.port';
import type { DnsResolver } from '../domain/ports/dns-resolver.port';
import type { PublicHostAddress } from '../domain/ports/public-host-address.port';
import { PlatformSettingsRepository } from '../domain/repositories/platform-settings.repository';

import { buildControlPlaneDomainWarning } from './build-control-plane-domain-warning';
import { checkControlPlaneDomainUseCase } from './check-control-plane-domain.use-case';

/**
 * Use case for writing the parameters of the deployment system.
 *
 * @param settings Platform settings repository
 * @param dns Resolver of the public DNS
 * @param publicAddress Source of the public address of this host
 * @param cloudflareRanges Source of the ranges of the addresses of Cloudflare
 * @param envFile Writer of the environment of the stack
 * @param updateDto Parameters to keep
 *
 * @returns Parameters the system keeps, and the advice of the check of the domain
 *
 * @throws InvalidLogRetentionError When the age falls outside the limits of the platform
 * @throws InvalidGitpaasDomainError When the host of the control plane breaks the rule of a host name
 * @throws HostAddressUnknownError When the public address of this host cannot be read, and the operator confirms nothing
 * @throws GitpaasDomainNotPointingAtHostError When the host of the control plane resolves elsewhere, and the operator confirms nothing
 * @throws ControlPlaneEnvWriteError When the row is kept and the environment of the stack refuses the write
 */
export async function updatePlatformSettingsUseCase(
    settings: PlatformSettingsRepository,
    dns: DnsResolver,
    publicAddress: PublicHostAddress,
    cloudflareRanges: CloudflareRanges,
    envFile: ControlPlaneEnvFile,
    updateDto: UpdatePlatformSettingsDto,
): Promise<UpdatePlatformSettingsResult> {
    const { acknowledgeDomainWarning, gitpaasDomain, logRetentionDays, publicHostAddress } = updateDto;

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

    let domainWarning: ControlPlaneDomainWarning | null = null;

    if (gitpaasDomain !== undefined) {
        const check = await checkControlPlaneDomainUseCase(dns, publicAddress, cloudflareRanges, gitpaasDomain);

        domainWarning = buildControlPlaneDomainWarning(check);

        if (domainWarning !== null && acknowledgeDomainWarning !== true) {
            if (domainWarning.reason === 'host-address-unknown') {
                throw new HostAddressUnknownError();
            }

            throw new GitpaasDomainNotPointingAtHostError(domainWarning);
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

    return { ...saved, domainWarning };
}
