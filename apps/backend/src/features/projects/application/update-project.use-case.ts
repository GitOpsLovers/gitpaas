import { UpdateProjectDto } from '../domain/dtos/update-project.dto';
import { Project } from '../domain/models/project.model';
import { ProjectsRepository } from '../domain/repositories/projects.repository';

/**
 * Use case for updating a project.
 *
 * @param repository Projects repository
 * @param id Project id
 * @param updateDto Project data
 *
 * @returns Updated project, or `null` when it does not exist
 */
export function updateProjectUseCase(repository: ProjectsRepository, id: string, updateDto: UpdateProjectDto): Promise<Project | null> {
    return repository.update(id, updateDto);
}
