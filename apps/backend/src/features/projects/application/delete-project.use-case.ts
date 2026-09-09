import { ProjectNotFoundError } from '../domain/errors/project.errors';
import { ProjectsRepository } from '../domain/repositories/projects.repository';

/**
 * Use case for deleting a project of a namespace
 *
 * @param repository Projects repository
 * @param namespaceId Namespace the project must belong to
 * @param id Project id
 *
 * @returns `true` when a row was deleted, `false` otherwise
 *
 * @throws ProjectNotFoundError When the project does not exist, or belongs to another namespace
 */
export async function deleteProjectUseCase(
    repository: ProjectsRepository,
    namespaceId: string,
    id: string,
): Promise<boolean> {
    const project = await repository.findById(id);

    if (project?.namespaceId !== namespaceId) {
        throw new ProjectNotFoundError(id);
    }

    return repository.delete(id);
}
