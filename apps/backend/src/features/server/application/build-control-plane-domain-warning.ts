import type { ControlPlaneDomainWarning } from '@gitpaas/contracts';

import type { ControlPlaneDomainCheck } from '../domain/models/control-plane-domain.models';

/**
 * Writes the text one reason of a warning of the domain of the control plane gives the operator.
 *
 * @param check Answer of the check of the domain, which does not point at this host
 *
 * @returns The text of the warning
 */
function describeReason(check: ControlPlaneDomainCheck): string {
    const { host, hostAddress, provider, resolvedAddresses } = check;

    if (check.reason === 'host-address-unknown' || hostAddress === null) {
        return `The platform does not know the public address of this host, so it could not check ${host}. Write the public address of the host in the settings of the server.`;
    }

    if (check.reason === 'no-resolution') {
        return `The domain ${host} resolves to no address. Add a record A or AAAA of ${host} that points at ${hostAddress}.`;
    }

    const resolved = resolvedAddresses.join(', ');

    if (check.reason === 'cdn') {
        return `The domain ${host} resolves to ${resolved}, an address of ${provider ?? 'a CDN'}, and this host answers on ${hostAddress}. The traffic reaches GitPaaS through ${provider ?? 'that CDN'}, so the domain works while it points at this host.`;
    }

    return `The domain ${host} resolves to ${resolved}, and this host answers on ${hostAddress}. Point the record A or AAAA of ${host} at ${hostAddress}.`;
}

/**
 * Builds the advice the check of the domain of the control plane gives the operator.
 *
 * @param check Answer of the check of the domain
 *
 * @returns The warning of the check, or null when the domain points at this host
 */
export function buildControlPlaneDomainWarning(check: ControlPlaneDomainCheck): ControlPlaneDomainWarning | null {
    if (check.reason === null) {
        return null;
    }

    return {
        host: check.host,
        resolvedAddresses: check.resolvedAddresses,
        hostAddress: check.hostAddress,
        reason: check.reason,
        provider: check.provider,
        message: describeReason(check),
    };
}
