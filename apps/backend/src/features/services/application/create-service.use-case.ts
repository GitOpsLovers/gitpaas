import type { CreateServiceDto } from '@gitpaas/contracts';

import { Service } from '../domain/models/service.models';
import { ServicesRepository } from '../domain/repositories/services.repository';

import { NamespaceNotFoundError } from '@features/namespaces/domain/errors/namespace.errors';
import { NamespacesRepository } from '@features/namespaces/domain/repositories/namespaces.repository';
import { ProjectNotFoundError } from '@features/projects/domain/errors/project.errors';
import { ProjectsRepository } from '@features/projects/domain/repositories/projects.repository';
import { getComposeProjectName } from '@shared/application/get-compose-project-name.use-case';

/**
 * Use case for creating a new service.
 *
 * @param repository Services repository
 * @param projectsRepository Projects repository
 * @param namespacesRepository Namespaces repository
 * @param createDto Service data
 *
 * @returns Created service
 *
 * @throws ProjectNotFoundError When the project does not exist
 * @throws NamespaceNotFoundError When the namespace of the project does not exist
 */
export async function createServiceUseCase(
    repository: ServicesRepository,
    projectsRepository: ProjectsRepository,
    namespacesRepository: NamespacesRepository,
    createDto: CreateServiceDto,
): Promise<Service> {
    const project = await projectsRepository.findById(createDto.projectId);

    if (!project) {
        throw new ProjectNotFoundError(createDto.projectId);
    }

    const namespace = await namespacesRepository.findById(project.namespaceId);

    if (!namespace) {
        throw new NamespaceNotFoundError(project.namespaceId);
    }

    return repository.create({ ...createDto, composeProject: getComposeProjectName(namespace, project) });
}
