import type { ClaimDomainDto } from '@gitpaas/contracts';

import { DomainTakenError } from '../domain/errors/domain.errors';
import { Domain } from '../domain/models/domain.models';
import { DomainsRepository } from '../domain/repositories/domains.repository';

/**
 * Use case for claiming a domain for a service.
 *
 * @param repository Domains repository
 * @param serviceId Service the domain belongs to
 * @param claimDto Domain data
 *
 * @returns Claimed domain
 *
 * @throws DomainTakenError When any service of the installation already holds the host
 */
export async function claimDomainUseCase(
    repository: DomainsRepository,
    serviceId: string,
    claimDto: ClaimDomainDto,
): Promise<Domain> {
    const existing = await repository.findByHost(claimDto.host);

    if (existing) {
        throw new DomainTakenError(claimDto.host);
    }

    return repository.create(serviceId, claimDto, claimDto.https ? 'pending' : 'none');
}
