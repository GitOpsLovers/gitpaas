import { ComposeDomainsCache } from '@features/services/domain/models/compose-domains.models';

/**
 * Reader of the cache of the key `x-gitpaas-domain` of the compose file of a service.
 */
export interface ComposeDomainsCacheStore {
    /**
     * Gets the cache of the compose file of a service
     *
     * @param serviceId Service the compose file belongs to
     *
     * @returns The cache of the service, or `null` when GitPaaS never read its compose file
     */
    findByService: (serviceId: string) => Promise<ComposeDomainsCache | null>;
}
