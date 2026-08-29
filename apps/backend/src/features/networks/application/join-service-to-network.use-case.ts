import type { JoinProjectNetworkDto } from '@gitpaas/contracts';

import { ProjectNetworkNotFoundError } from '../domain/errors/project-network.errors';
import { ProjectNetworksRepository } from '../domain/repositories/project-networks.repository';
import { ServiceNetworksRepository } from '../domain/repositories/service-networks.repository';

import { ServiceNotFoundError } from '@features/services/domain/errors/service.errors';
import { ServicesRepository } from '@features/services/domain/repositories/services.repository';

/**
 * Use case for joining a service to a network of its project.
 *
 * @param servicesRepository Services repository
 * @param networksRepository Project networks repository
 * @param serviceNetworksRepository Service networks repository
 * @param projectId Project the network belongs to
 * @param networkId Network the service joins
 * @param joinDto Service that joins the network
 *
 * @throws ProjectNetworkNotFoundError When the project holds no network of that id
 * @throws ServiceNotFoundError When the project holds no service of that id
 */
export async function joinServiceToNetworkUseCase(
    servicesRepository: ServicesRepository,
    networksRepository: ProjectNetworksRepository,
    serviceNetworksRepository: ServiceNetworksRepository,
    projectId: string,
    networkId: string,
    joinDto: JoinProjectNetworkDto,
): Promise<void> {
    const network = await networksRepository.findById(networkId);

    if (network?.projectId !== projectId) {
        throw new ProjectNetworkNotFoundError(networkId);
    }

    const service = await servicesRepository.findById(joinDto.serviceId);

    if (service?.projectId !== projectId) {
        throw new ServiceNotFoundError(joinDto.serviceId);
    }

    await serviceNetworksRepository.join(joinDto.serviceId, networkId);
}
