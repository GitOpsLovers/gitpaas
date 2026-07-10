import { CreateProjectDto } from '../dtos/create-project.dto';
import { UpdateProjectDto } from '../dtos/update-project.dto';
import { Project } from '../models/project.model';

/**
 * Projects repository
 */
export interface ProjectsRepository {
    /**
     * Gets all projects
     *
     * @returns All projects
     */
    getAll: () => Promise<Project[]>;

    /**
     * Gets a single project by id
     *
     * @param id Project id
     *
     * @returns Project, or `null` when it does not exist
     */
    findById: (id: string) => Promise<Project | null>;

    /**
     * Creates a project
     *
     * @param createDto Project data
     *
     * @returns Created project
     */
    create: (createDto: CreateProjectDto) => Promise<Project>;

    /**
     * Updates a project
     *
     * @param id Project id
     * @param updateDto Project data
     *
     * @returns Updated project, or `null` when it does not exist
     */
    update: (id: string, updateDto: UpdateProjectDto) => Promise<Project | null>;

    /**
     * Deletes a project
     *
     * @param id Project id
     * @returns `true` when a row was deleted, `false` otherwise
     */
    delete: (id: string) => Promise<boolean>;
}
