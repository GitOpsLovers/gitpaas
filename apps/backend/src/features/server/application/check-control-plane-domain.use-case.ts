import type { ControlPlaneDomainCheck } from '../domain/models/control-plane-domain.models';
import type { DnsResolver } from '../domain/ports/dns-resolver.port';
import type { PublicHostAddress } from '../domain/ports/public-host-address.port';

/**
 * Use case for checking that the domain of the control plane points at this host.
 *
 * @param dns Resolver of the public DNS
 * @param publicAddress Source of the public address of this host
 * @param host Host name the control plane must answer on
 *
 * @returns The addresses of the host name, the address of this host, and whether they meet
 */
export async function checkControlPlaneDomainUseCase(
    dns: DnsResolver,
    publicAddress: PublicHostAddress,
    host: string,
): Promise<ControlPlaneDomainCheck> {
    const [resolvedAddresses, hostAddress] = await Promise.all([
        dns.resolveAddresses(host),
        publicAddress.read(),
    ]);

    return {
        host,
        resolvedAddresses,
        hostAddress,
        pointsAtHost: hostAddress !== null && resolvedAddresses.includes(hostAddress),
    };
}
