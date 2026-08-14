import { CreateProjectDto } from '../dtos/create-project.dto';
import { UpdateProjectDto } from '../dtos/update-project.dto';
import { Project } from '../models/project.models';

/**
 * Data a project needs to be written, the name coming from the body and the
 * namespace from the path segment that owns the resource.
 */
export type CreateProjectData = CreateProjectDto & Pick<Project, 'namespaceId'>;

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
     * @param createData Project data, including the namespace it belongs to
     *
     * @returns Created project
     */
    create: (createData: CreateProjectData) => Promise<Project>;

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
