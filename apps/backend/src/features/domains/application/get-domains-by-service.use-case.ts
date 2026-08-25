import { Domain } from '../domain/models/domain.models';
import { DomainsRepository } from '../domain/repositories/domains.repository';

/**
 * Use case for listing the domains of a service.
 *
 * @param repository Domains repository
 * @param serviceId Service the domains belong to
 *
 * @returns Domains of the service, ordered by host
 */
export function getDomainsByServiceUseCase(
    repository: DomainsRepository,
    serviceId: string,
): Promise<Domain[]> {
    return repository.getByService(serviceId);
}
