import { DomainRow } from '../domain/models/domain.models';
import { ComposeDomainsCacheStore } from '../domain/ports/compose-domains-cache-store.port';
import { ReverseProxy } from '../domain/ports/reverse-proxy.port';
import { DomainsRepository } from '../domain/repositories/domains.repository';

import { refreshCertificateStatesUseCase } from './refresh-certificate-states.use-case';

import { ComposeDomainDeclaration } from '@features/services/domain/models/compose-domains.models';

/**
 * Builds the row of a host that the compose file declares and that no record holds, which the user never saved.
 *
 * @param serviceId Service the declaration belongs to
 * @param declaration Domain the compose file declares
 *
 * @returns The row of the list
 */
function toDeclaredRow(serviceId: string, declaration: ComposeDomainDeclaration): DomainRow {
    return {
        id: null,
        serviceId,
        host: declaration.host,
        targetService: declaration.targetService,
        port: declaration.port,
        https: declaration.https,
        certificateState: declaration.https ? 'pending' : 'none',
        certificateError: null,
        origin: 'compose',
    };
}

/**
 * Use case for listing the domains of a service, as the union of the records of the table and of the hosts the compose file declares.
 *
 * @param repository Domains repository
 * @param proxy Reverse proxy
 * @param cacheStore Store of the cache of the domains the compose file declares
 * @param serviceId Service the domains belong to
 *
 * @returns Rows of the service, ordered by host. A host of both sides gives one row, which keeps the record of the table
 */
export async function getDomainsByServiceUseCase(
    repository: DomainsRepository,
    proxy: ReverseProxy,
    cacheStore: ComposeDomainsCacheStore,
    serviceId: string,
): Promise<DomainRow[]> {
    const [domains, cache] = await Promise.all([
        repository.getByService(serviceId),
        cacheStore.findByService(serviceId),
    ]);

    const stored = await refreshCertificateStatesUseCase(repository, proxy, domains);
    const storedHosts = new Set(domains.map((domain) => domain.host));

    const unsaved = (cache?.domains ?? [])
        .filter((declaration) => !storedHosts.has(declaration.host))
        .map((declaration) => toDeclaredRow(serviceId, declaration));

    return [...stored, ...unsaved].sort((one, other) => one.host.localeCompare(other.host));
}
