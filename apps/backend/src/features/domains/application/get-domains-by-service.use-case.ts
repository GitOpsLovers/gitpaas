import { Domain } from '../domain/models/domain.models';
import { ReverseProxy } from '../domain/ports/reverse-proxy.port';
import { DomainsRepository } from '../domain/repositories/domains.repository';

import { refreshCertificateStatesUseCase } from './refresh-certificate-states.use-case';

/**
 * Use case for listing the domains of a service, each with the state its certificate stands at.
 *
 * @param repository Domains repository
 * @param proxy Reverse proxy
 * @param serviceId Service the domains belong to
 *
 * @returns Domains of the service, ordered by host
 */
export async function getDomainsByServiceUseCase(
    repository: DomainsRepository,
    proxy: ReverseProxy,
    serviceId: string,
): Promise<Domain[]> {
    const domains = await repository.getByService(serviceId);

    return refreshCertificateStatesUseCase(repository, proxy, domains);
}
