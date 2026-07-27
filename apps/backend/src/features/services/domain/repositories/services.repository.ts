import { CreateServiceDto } from '../dtos/create-service.dto';
import { UpdateServiceDto } from '../dtos/update-service.dto';
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
     * @param createDto Data for creating the service
     *
     * @returns Created service
     */
    create: (createDto: CreateServiceDto) => Promise<Service>;

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
     * Delete a service
     *
     * @param id Service identifier
     *
     * @returns `true` when a row was deleted, `false` otherwise
     */
    delete: (id: string) => Promise<boolean>;
}
