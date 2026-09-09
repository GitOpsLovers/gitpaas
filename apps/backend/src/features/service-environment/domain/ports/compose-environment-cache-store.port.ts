import { ComposeEnvironmentCache } from '@features/services/domain/models/compose-environment.models';

/**
 * Reader and writer of the cache of the key `environment` of the compose file of a service.
 */
export interface ComposeEnvironmentCacheStore {
    /**
     * Gets the cache of the compose file of a service
     *
     * @param serviceId Service the compose file belongs to
     *
     * @returns The cache of the service, or `null` when GitPaaS never read its compose file
     */
    findByService: (serviceId: string) => Promise<ComposeEnvironmentCache | null>;

    /**
     * Drops one name from the cache of a service, so the list stops carrying it until the next refresh
     *
     * @param serviceId Service the compose file belongs to
     * @param name Name to drop
     */
    forgetName: (serviceId: string, name: string) => Promise<void>;
}
