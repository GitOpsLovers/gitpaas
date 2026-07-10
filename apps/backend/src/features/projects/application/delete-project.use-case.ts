import { ProjectsRepository } from '../domain/repositories/projects.repository';

/**
 * Use case for deleting a project
 *
 * @param repository Projects repository
 * @param id Project id
 *
 * @returns `true` when a row was deleted, `false` otherwise
 */
export function deleteProjectUseCase(repository: ProjectsRepository, id: string): Promise<boolean> {
    return repository.delete(id);
}
