import { ProjectNetwork } from '../models/project-network.models';

/**
 * Service networks repository, which holds the join between a service and a network of its project
 */
export interface ServiceNetworksRepository {
    /**
     * Gets every network of a project that a service joined, ordered by name
     *
     * @param serviceId Service id
     *
     * @returns Networks the service joined
     */
    listByService: (serviceId: string) => Promise<ProjectNetwork[]>;

    /**
     * Gets the services that joined a network of a project
     *
     * @param networkId Network id
     *
     * @returns Ids of the services that joined the network
     */
    listServiceIds: (networkId: string) => Promise<string[]>;

    /**
     * Joins a service to a network of its project, and keeps a join that already exists
     *
     * @param serviceId Service id
     * @param networkId Network id
     */
    join: (serviceId: string, networkId: string) => Promise<void>;

    /**
     * Removes a service from a network of its project
     *
     * @param serviceId Service id
     * @param networkId Network id
     *
     * @returns `true` when a row was deleted, `false` otherwise
     */
    leave: (serviceId: string, networkId: string) => Promise<boolean>;
}
