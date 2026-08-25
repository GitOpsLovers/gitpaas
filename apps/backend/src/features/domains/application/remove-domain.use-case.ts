import { DomainNotFoundError } from '../domain/errors/domain.errors';
import { DomainsRepository } from '../domain/repositories/domains.repository';

/**
 * Use case for removing a domain of a service.
 *
 * @param repository Domains repository
 * @param serviceId Service the domain belongs to
 * @param id Domain id
 *
 * @throws DomainNotFoundError When the service holds no domain of that id
 */
export async function removeDomainUseCase(
    repository: DomainsRepository,
    serviceId: string,
    id: string,
): Promise<void> {
    const domain = await repository.findById(id);

    if (domain?.serviceId !== serviceId) {
        throw new DomainNotFoundError(id);
    }

    const deleted = await repository.delete(id);

    if (!deleted) {
        throw new DomainNotFoundError(id);
    }
}
