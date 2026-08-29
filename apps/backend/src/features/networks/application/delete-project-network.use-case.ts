import {
    ProjectNetworkInUseError,
    ProjectNetworkNotFoundError,
} from '../domain/errors/project-network.errors';
import { ProjectNetworksRepository } from '../domain/repositories/project-networks.repository';

import { ContainerRuntime } from '@core/domain/ports/container-runtime.port';

/**
 * Use case for removing a network of a project, on the daemon and in the database.
 *
 * @param networksRepository Project networks repository
 * @param runtime Container runtime port
 * @param projectId Project the network belongs to
 * @param id Network id
 *
 * @throws ProjectNetworkNotFoundError When the project holds no network of that id
 * @throws ProjectNetworkInUseError When a container still holds the network
 */
export async function deleteProjectNetworkUseCase(
    networksRepository: ProjectNetworksRepository,
    runtime: ContainerRuntime,
    projectId: string,
    id: string,
): Promise<void> {
    const network = await networksRepository.findById(id);

    if (network?.projectId !== projectId) {
        throw new ProjectNetworkNotFoundError(id);
    }

    const containers = await runtime.listContainers({}, true);
    const held = containers.some((container) => container.networks.includes(network.daemonName));

    if (held) {
        throw new ProjectNetworkInUseError(network.name);
    }

    const daemonNetworks = await runtime.listNetworks({});

    if (daemonNetworks.some((daemonNetwork) => daemonNetwork.name === network.daemonName)) {
        await runtime.removeNetwork(network.daemonName);
    }

    const deleted = await networksRepository.delete(id);

    if (!deleted) {
        throw new ProjectNetworkNotFoundError(id);
    }
}
