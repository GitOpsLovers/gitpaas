import type { UpdateProjectNetworkDto } from '@gitpaas/contracts';

import {
    ProjectNetworkNameTakenError,
    ProjectNetworkNotFoundError,
} from '../domain/errors/project-network.errors';
import { ProjectNetworkStatus } from '../domain/models/project-network.models';
import { ProjectNetworksRepository } from '../domain/repositories/project-networks.repository';

import { ContainerRuntime } from '@core/domain/ports/container-runtime.port';

/**
 * Use case for changing the display name of a network of a project.
 *
 * @param networksRepository Project networks repository
 * @param runtime Container runtime port
 * @param projectId Project the network belongs to
 * @param id Network id
 * @param updateDto New network data
 *
 * @returns Renamed network, with the state the daemon gives it
 *
 * @throws ProjectNetworkNotFoundError When the project holds no network of that id
 * @throws ProjectNetworkNameTakenError When the project already holds another network of that name
 */
export async function renameProjectNetworkUseCase(
    networksRepository: ProjectNetworksRepository,
    runtime: ContainerRuntime,
    projectId: string,
    id: string,
    updateDto: UpdateProjectNetworkDto,
): Promise<ProjectNetworkStatus> {
    const network = await networksRepository.findById(id);

    if (network?.projectId !== projectId) {
        throw new ProjectNetworkNotFoundError(id);
    }

    const networks = await networksRepository.listByProject(projectId);

    if (networks.some((sibling) => sibling.name === updateDto.name && sibling.id !== id)) {
        throw new ProjectNetworkNameTakenError(projectId, updateDto.name);
    }

    const renamed = await networksRepository.rename(id, updateDto.name);

    if (!renamed) {
        throw new ProjectNetworkNotFoundError(id);
    }

    const daemonNetworks = await runtime.listNetworks({});
    const exists = daemonNetworks.some((daemonNetwork) => daemonNetwork.name === renamed.daemonName);

    return { ...renamed, state: exists ? 'ready' : 'missing' };
}
