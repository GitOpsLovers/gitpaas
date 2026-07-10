import { Project } from '../domain/models/project.model';
import { ProjectsRepository } from '../domain/repositories/projects.repository';

/**
 * Use case for finding a project by its id.
 *
 * @param repository Projects repository
 * @param id Project id
 *
 * @returns Project, or `null` when it does not exist
 */
export function findProjectByIdUseCase(repository: ProjectsRepository, id: string): Promise<Project | null> {
    return repository.findById(id);
}
