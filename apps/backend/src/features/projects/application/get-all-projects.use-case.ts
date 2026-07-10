import { Project } from '../domain/models/project.model';
import { ProjectsRepository } from '../domain/repositories/projects.repository';

/**
 * Use case for retrieving all projects.
 *
 * @param repository Projects repository
 *
 * @returns All projects
 */
export function getAllProjectsUseCase(repository: ProjectsRepository): Promise<Project[]> {
    return repository.getAll();
}
