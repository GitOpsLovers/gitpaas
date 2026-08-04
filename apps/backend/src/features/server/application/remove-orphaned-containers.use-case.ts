import { OrphanRemovalResult } from '../domain/models/orphan-removal-result.models';
import { OrphanContainers } from '../domain/ports/orphan-containers.port';

import { serviceProjectNameUseCase } from '@core/application/service-project-name.use-case';
import { ServicesRepository } from '@features/services/domain/repositories/services.repository';

/**
 * Use case for force-removing orphaned GitPaaS containers from the server.
 *
 * Computes the project names of every existing service and asks the
 * repository to remove any GitPaaS container whose project isn't among them.
 *
 * @param orphanContainers Orphan containers repository
 * @param servicesRepository Services repository
 *
 * @returns Number of orphaned containers removed and their names
 */
export async function removeOrphanedContainersUseCase(
    orphanContainers: OrphanContainers,
    servicesRepository: ServicesRepository,
): Promise<OrphanRemovalResult> {
    const services = await servicesRepository.getAll();
    const knownProjects = services.map(serviceProjectNameUseCase);

    return orphanContainers.removeOrphaned(knownProjects);
}
