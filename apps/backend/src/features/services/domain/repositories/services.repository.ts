import { CreateServiceDto } from '../dtos/create-service.dto';
import { UpdateServiceDto } from '../dtos/update-service.dto';
import { Service } from '../models/service.model';

/**
 * Services repository
 */
export interface ServicesRepository {
    /**
     * Get every service across all projects
     */
    getAll: () => Promise<Service[]>;

    /**
     * Get every service belonging to a project
     *
     * @param projectId Project identifier
     */
    getAllByProject: (projectId: string) => Promise<Service[]>;

    /**
     * Find a single service by its identifier
     *
     * @param id Service identifier
     */
    findById: (id: string) => Promise<Service | null>;

    /**
     * Create a new service
     *
     * @param createDto Data for creating the service
     */
    create: (createDto: CreateServiceDto) => Promise<Service>;

    /**
     * Update an existing service
     *
     * @param id Service identifier
     * @param updateDto Data for updating the service
     */
    update: (id: string, updateDto: UpdateServiceDto) => Promise<Service | null>;

    /**
     * Delete a service
     *
     * @param id Service identifier
     */
    delete: (id: string) => Promise<boolean>;
}
