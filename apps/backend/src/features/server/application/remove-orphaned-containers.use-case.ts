import type { OrphanRemovalResult } from '@gitpaas/contracts';

import { OrphanContainers } from '../domain/ports/orphan-containers.port';

import { ServicesRepository } from '@features/services/domain/repositories/services.repository';

/**
 * Use case for force-removing orphaned GitPaaS containers from the server.
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
    const knownServiceIds = services.map((service) => service.id);

    return orphanContainers.removeOrphaned(knownServiceIds);
}
