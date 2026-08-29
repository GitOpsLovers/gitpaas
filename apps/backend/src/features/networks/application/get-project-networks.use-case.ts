import { ProjectNetworkStatus } from '../domain/models/project-network.models';
import { ProjectNetworksRepository } from '../domain/repositories/project-networks.repository';

import { getProjectNetworkDaemonPrefixUseCase } from './get-project-network-daemon-name.use-case';

import { ContainerRuntime } from '@core/domain/ports/container-runtime.port';

/**
 * Use case for listing the networks of a project, with the state the daemon gives each one.
 *
 * @param networksRepository Project networks repository
 * @param runtime Container runtime port
 * @param projectId Project the networks belong to
 *
 * @returns Networks of the project, the stored ones first
 */
export async function getProjectNetworksUseCase(
    networksRepository: ProjectNetworksRepository,
    runtime: ContainerRuntime,
    projectId: string,
): Promise<ProjectNetworkStatus[]> {
    const [networks, daemonNetworks] = await Promise.all([
        networksRepository.listByProject(projectId),
        runtime.listNetworks({}),
    ]);

    const daemonNames = new Set(daemonNetworks.map((network) => network.name));
    const storedNames = new Set(networks.map((network) => network.daemonName));
    const prefix = getProjectNetworkDaemonPrefixUseCase(projectId);

    const stored = networks.map<ProjectNetworkStatus>((network) => ({
        ...network,
        state: daemonNames.has(network.daemonName) ? 'ready' : 'missing',
    }));

    const orphans = daemonNetworks
        .filter((network) => network.name.startsWith(prefix) && !storedNames.has(network.name))
        .map<ProjectNetworkStatus>((network) => ({
            id: network.name.slice(prefix.length),
            projectId,
            name: network.name,
            daemonName: network.name,
            state: 'orphan',
        }));

    return [...stored, ...orphans];
}
