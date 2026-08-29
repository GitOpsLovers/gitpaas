import { ProjectNetwork } from '../models/project-network.models';

/**
 * Project networks repository
 */
export interface ProjectNetworksRepository {
    /**
     * Gets every network of a project, ordered by name
     *
     * @param projectId Project id
     *
     * @returns Networks of the project
     */
    listByProject: (projectId: string) => Promise<ProjectNetwork[]>;

    /**
     * Gets a single network of a project by id
     *
     * @param id Network id
     *
     * @returns Network, or `null` when it does not exist
     */
    findById: (id: string) => Promise<ProjectNetwork | null>;

    /**
     * Stores a network of a project
     *
     * @param network Network to store, with the id that the daemon name carries
     *
     * @returns Stored network
     */
    create: (network: ProjectNetwork) => Promise<ProjectNetwork>;

    /**
     * Changes the display name of a network of a project
     *
     * @param id Network id
     * @param name New display name
     *
     * @returns Renamed network, or `null` when it does not exist
     */
    rename: (id: string, name: string) => Promise<ProjectNetwork | null>;

    /**
     * Removes a network of a project
     *
     * @param id Network id
     *
     * @returns `true` when a row was deleted, `false` otherwise
     */
    delete: (id: string) => Promise<boolean>;
}
