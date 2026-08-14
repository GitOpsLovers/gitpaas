import { Project } from '../domain/models/project.models';
import { ProjectsRepository } from '../domain/repositories/projects.repository';

/**
 * Use case for retrieving all the projects of a namespace.
 *
 * @param repository Projects repository
 * @param namespaceId Namespace the projects belong to
 *
 * @returns All the projects of the namespace
 */
export function getAllProjectsUseCase(repository: ProjectsRepository, namespaceId: string): Promise<Project[]> {
    return repository.getAll(namespaceId);
}
