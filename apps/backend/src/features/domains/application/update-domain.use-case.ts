import type { UpdateDomainDto } from '@gitpaas/contracts';

import { DomainNotFoundError, DomainTakenError } from '../domain/errors/domain.errors';
import { CertificateState, Domain } from '../domain/models/domain.models';
import { DomainsRepository } from '../domain/repositories/domains.repository';

/**
 * Builds the state the certificate returns to after a change.
 *
 * A change of the host or of the choice of HTTPS asks the proxy for a new certificate, so the
 * state starts again. Any other change keeps the state that the row holds.
 *
 * @param domain Domain as the row holds it today
 * @param updateDto Domain data
 *
 * @returns The state the row stores, or `undefined` to keep the stored one
 */
function resolveCertificateState(domain: Domain, updateDto: UpdateDomainDto): CertificateState | undefined {
    const hostChanged = updateDto.host !== undefined && updateDto.host !== domain.host;
    const httpsChanged = updateDto.https !== undefined && updateDto.https !== domain.https;

    if (!hostChanged && !httpsChanged) {
        return undefined;
    }

    return (updateDto.https ?? domain.https) ? 'pending' : 'none';
}

/**
 * Use case for changing a domain of a service.
 *
 * @param repository Domains repository
 * @param serviceId Service the domain belongs to
 * @param id Domain id
 * @param updateDto Domain data
 *
 * @returns Updated domain
 *
 * @throws DomainNotFoundError When the service holds no domain of that id
 * @throws DomainTakenError When another domain of the installation already holds the new host
 */
export async function updateDomainUseCase(
    repository: DomainsRepository,
    serviceId: string,
    id: string,
    updateDto: UpdateDomainDto,
): Promise<Domain> {
    const domain = await repository.findById(id);

    if (domain?.serviceId !== serviceId) {
        throw new DomainNotFoundError(id);
    }

    if (updateDto.host !== undefined && updateDto.host !== domain.host) {
        const existing = await repository.findByHost(updateDto.host);

        if (existing) {
            throw new DomainTakenError(updateDto.host);
        }
    }

    const updated = await repository.update(id, updateDto, resolveCertificateState(domain, updateDto));

    if (!updated) {
        throw new DomainNotFoundError(id);
    }

    return updated;
}
