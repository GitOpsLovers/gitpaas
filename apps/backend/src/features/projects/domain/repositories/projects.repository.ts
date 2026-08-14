import { CreateProjectInNamespaceDto } from '../dtos/create-project-in-namespace.dto';
import { UpdateProjectDto } from '../dtos/update-project.dto';
import { Project } from '../models/project.models';

/**
 * Projects repository
 */
export interface ProjectsRepository {
    /**
     * Gets all the projects of a namespace
     *
     * @param namespaceId Namespace id
     *
     * @returns All the projects of the namespace
     */
    getAll: (namespaceId: string) => Promise<Project[]>;

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
     * @param createDto Project data, including the namespace it belongs to
     *
     * @returns Created project
     */
    create: (createDto: CreateProjectInNamespaceDto) => Promise<Project>;

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
