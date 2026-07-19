import { OrphanRemovalResult } from '../domain/models/orphan-removal-result.model';
import { OrphanContainersRepository } from '../domain/repositories/orphan-containers.repository';

import { Service } from '@features/services/domain/models/service.model';
import { ServicesRepository } from '@features/services/domain/repositories/services.repository';

/**
 * Builds the Docker Compose project name for a service from its name, falling
 * back to its id. This value groups all of the service's Docker resources under
 * the `com.docker.compose.project` label.
 *
 * @param service Service to derive the project name from
 *
 * @returns Compose project name
 */
function composeProjectName(service: Service): string {
    const slug = service.name.toLowerCase().replace(/[^\da-z]+/g, '-').replace(/^-+|-+$/g, '');

    return slug || `service-${service.id}`;
}

/**
 * Use case for force-removing orphaned GitPaaS containers from the VPS.
 *
 * Computes the compose project names of every existing service and asks the
 * repository to remove any GitPaaS container whose project isn't among them.
 *
 * @param orphanContainers Orphan containers repository
 * @param servicesRepository Services repository
 *
 * @returns Number of orphaned containers removed and their names
 */
export async function removeOrphanedContainersUseCase(
    orphanContainers: OrphanContainersRepository,
    servicesRepository: ServicesRepository,
): Promise<OrphanRemovalResult> {
    const services = await servicesRepository.getAll();
    const knownProjects = services.map(composeProjectName);

    return orphanContainers.removeOrphaned(knownProjects);
}
