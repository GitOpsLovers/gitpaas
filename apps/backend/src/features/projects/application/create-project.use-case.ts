import type { CreateProjectDto } from '@gitpaas/contracts';

import { Project } from '../domain/models/project.models';
import { ProjectsRepository } from '../domain/repositories/projects.repository';

/**
 * Use case for creating a new project inside a namespace
 *
 * @param repository Projects repository
 * @param namespaceId Namespace the project belongs to
 * @param createDto Project data
 *
 * @returns Created project
 */
export function createProjectUseCase(
    repository: ProjectsRepository,
    namespaceId: string,
    createDto: CreateProjectDto,
): Promise<Project> {
    return repository.create({ ...createDto, namespaceId });
}
