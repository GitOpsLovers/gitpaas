import { ProjectNetworkNotFoundError } from '../domain/errors/project-network.errors';
import { ProjectNetworksRepository } from '../domain/repositories/project-networks.repository';
import { ServiceNetworksRepository } from '../domain/repositories/service-networks.repository';

import { ServiceNotFoundError } from '@features/services/domain/errors/service.errors';

/**
 * Use case for removing a service from a network of its project.
 *
 * @param networksRepository Project networks repository
 * @param serviceNetworksRepository Service networks repository
 * @param projectId Project the network belongs to
 * @param networkId Network the service leaves
 * @param serviceId Service that leaves the network
 *
 * @throws ProjectNetworkNotFoundError When the project holds no network of that id
 * @throws ServiceNotFoundError When that service did not join the network
 */
export async function removeServiceFromNetworkUseCase(
    networksRepository: ProjectNetworksRepository,
    serviceNetworksRepository: ServiceNetworksRepository,
    projectId: string,
    networkId: string,
    serviceId: string,
): Promise<void> {
    const network = await networksRepository.findById(networkId);

    if (network?.projectId !== projectId) {
        throw new ProjectNetworkNotFoundError(networkId);
    }

    const left = await serviceNetworksRepository.leave(serviceId, networkId);

    if (!left) {
        throw new ServiceNotFoundError(serviceId);
    }
}
