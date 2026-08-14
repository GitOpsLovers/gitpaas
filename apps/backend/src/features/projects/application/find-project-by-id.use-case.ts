import { ProjectNotFoundError } from '../domain/errors/project.errors';
import { Project } from '../domain/models/project.models';
import { ProjectsRepository } from '../domain/repositories/projects.repository';

/**
 * Use case for finding a project by its id inside a namespace.
 *
 * @param repository Projects repository
 * @param namespaceId Namespace the project must belong to
 * @param id Project id
 *
 * @returns Project
 *
 * @throws ProjectNotFoundError When the project does not exist, or belongs to another namespace
 */
export async function findProjectByIdUseCase(
    repository: ProjectsRepository,
    namespaceId: string,
    id: string,
): Promise<Project> {
    const project = await repository.findById(id);

    if (!project || project.namespaceId !== namespaceId) {
        throw new ProjectNotFoundError(id);
    }

    return project;
}
