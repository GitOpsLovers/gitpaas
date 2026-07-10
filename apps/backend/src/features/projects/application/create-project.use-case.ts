import { CreateProjectDto } from '../domain/dtos/create-project.dto';
import { Project } from '../domain/models/project.model';
import { ProjectsRepository } from '../domain/repositories/projects.repository';

/**
 * Use case for creating a new project
 *
 * @param repository Projects repository
 * @param createDto Project data
 *
 * @returns Created project
 */
export function createProjectUseCase(repository: ProjectsRepository, createDto: CreateProjectDto): Promise<Project> {
    return repository.create(createDto);
}
