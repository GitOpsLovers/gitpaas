import type { UpdateServiceDto } from '@gitpaas/contracts';

import { CreateServiceWithComposeProjectDto } from '../dtos/create-service-with-compose-project.dto';
import { ComposeDomainsCache } from '../models/compose-domains.models';
import { ComposeEnvironmentCache } from '../models/compose-environment.models';
import { Service } from '../models/service.models';

/**
 * Services repository
 */
export interface ServicesRepository {
    /**
     * Get every service across all projects
     *
     * @returns List of every service
     */
    getAll: () => Promise<Service[]>;

    /**
     * Get every service belonging to a project
     *
     * @param projectId Project identifier
     *
     * @returns List of services for the project
     */
    getAllByProject: (projectId: string) => Promise<Service[]>;

    /**
     * Find a single service by its identifier
     *
     * @param id Service identifier
     *
     * @returns Service, or `null` when it does not exist
     */
    findById: (id: string) => Promise<Service | null>;

    /**
     * Create a new service
     *
     * @param createDto Data for creating the service, including the name of its compose project
     *
     * @returns Created service
     */
    create: (createDto: CreateServiceWithComposeProjectDto) => Promise<Service>;

    /**
     * Update an existing service
     *
     * @param id Service identifier
     * @param updateDto Data for updating the service
     *
     * @returns Updated service, or `null` when it does not exist
     */
    update: (id: string, updateDto: UpdateServiceDto) => Promise<Service | null>;

    /**
     * Write the cache of the key `environment` of the compose file of a service
     *
     * @param id Service identifier
     * @param cache Names, values and moment of the read of the compose file
     */
    saveComposeEnvironment: (id: string, cache: ComposeEnvironmentCache) => Promise<void>;

    /**
     * Read the cache of the key `x-gitpaas-domain` of the compose file of a service
     *
     * @param id Service identifier
     *
     * @returns The cache of the service, or `null` when the service holds none
     */
    findComposeDomains: (id: string) => Promise<ComposeDomainsCache | null>;

    /**
     * Write the cache of the key `x-gitpaas-domain` of the compose file of a service
     *
     * @param id Service identifier
     * @param cache Domains and moment of the read of the compose file
     */
    saveComposeDomains: (id: string, cache: ComposeDomainsCache) => Promise<void>;

    /**
     * Delete a service
     *
     * @param id Service identifier
     *
     * @returns `true` when a row was deleted, `false` otherwise
     */
    delete: (id: string) => Promise<boolean>;
}
