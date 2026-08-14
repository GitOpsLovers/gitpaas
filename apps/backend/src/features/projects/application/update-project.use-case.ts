import { UpdateProjectDto } from '../domain/dtos/update-project.dto';
import { ProjectNotFoundError } from '../domain/errors/project.errors';
import { Project } from '../domain/models/project.models';
import { ProjectsRepository } from '../domain/repositories/projects.repository';

/**
 * Use case for updating a project of a namespace.
 *
 * @param repository Projects repository
 * @param namespaceId Namespace the project must belong to
 * @param id Project id
 * @param updateDto Project data
 *
 * @returns Updated project
 *
 * @throws ProjectNotFoundError When the project does not exist, or belongs to another namespace
 */
export async function updateProjectUseCase(
    repository: ProjectsRepository,
    namespaceId: string,
    id: string,
    updateDto: UpdateProjectDto,
): Promise<Project> {
    const project = await repository.findById(id);

    if (!project || project.namespaceId !== namespaceId) {
        throw new ProjectNotFoundError(id);
    }

    const updated = await repository.update(id, updateDto);

    if (!updated) {
        throw new ProjectNotFoundError(id);
    }

    return updated;
}
