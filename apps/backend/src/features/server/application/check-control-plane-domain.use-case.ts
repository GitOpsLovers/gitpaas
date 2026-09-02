import type { ControlPlaneDomainWarningReason } from '@gitpaas/contracts';

import type { ControlPlaneDomainCheck } from '../domain/models/control-plane-domain.models';
import type { CloudflareRanges } from '../domain/ports/cloudflare-ranges.port';
import type { DnsResolver } from '../domain/ports/dns-resolver.port';
import type { PublicHostAddress } from '../domain/ports/public-host-address.port';

import { findCdnProvider } from './find-cdn-provider';

/**
 * Names the reason a domain that does not point at this host warns the operator.
 *
 * @param resolvedAddresses Addresses the domain resolves to
 * @param hostAddress Public address of this host, or null while the platform does not know it
 * @param provider Name of the CDN that carries a resolved address, or null when none does
 *
 * @returns The reason of the warning
 */
function findWarningReason(
    resolvedAddresses: string[],
    hostAddress: string | null,
    provider: string | null,
): ControlPlaneDomainWarningReason {
    if (hostAddress === null) {
        return 'host-address-unknown';
    }

    if (resolvedAddresses.length === 0) {
        return 'no-resolution';
    }

    return provider === null ? 'mismatch' : 'cdn';
}

/**
 * Use case for checking that the domain of the control plane points at this host.
 *
 * @param dns Resolver of the public DNS
 * @param publicAddress Source of the public address of this host
 * @param cloudflareRanges Source of the ranges of the addresses of Cloudflare
 * @param host Host name the control plane must answer on
 *
 * @returns The addresses of the host name, the address of this host, whether they meet, and the
 * provider and the reason of a check that does not meet
 */
export async function checkControlPlaneDomainUseCase(
    dns: DnsResolver,
    publicAddress: PublicHostAddress,
    cloudflareRanges: CloudflareRanges,
    host: string,
): Promise<ControlPlaneDomainCheck> {
    const [resolvedAddresses, hostAddress, ranges] = await Promise.all([
        dns.resolveAddresses(host),
        publicAddress.read(),
        cloudflareRanges.readRanges(),
    ]);

    const pointsAtHost = hostAddress !== null && resolvedAddresses.includes(hostAddress);
    const provider = resolvedAddresses
        .map((address) => findCdnProvider(address, ranges))
        .find((name) => name !== null) ?? null;

    return {
        host,
        resolvedAddresses,
        hostAddress,
        pointsAtHost,
        provider,
        reason: pointsAtHost ? null : findWarningReason(resolvedAddresses, hostAddress, provider),
    };
}
