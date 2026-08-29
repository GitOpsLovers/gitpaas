import { ProjectNotFoundError } from '../domain/errors/project.errors';
import { ProjectsRepository } from '../domain/repositories/projects.repository';

import { ContainerRuntime } from '@core/domain/ports/container-runtime.port';
import { getProjectNetworkDaemonPrefixUseCase } from '@features/networks/application/get-project-network-daemon-name.use-case';

/**
 * Use case for deleting a project of a namespace, with the networks it holds on the daemon
 *
 * @param repository Projects repository
 * @param runtime Container runtime port
 * @param namespaceId Namespace the project must belong to
 * @param id Project id
 *
 * @returns `true` when a row was deleted, `false` otherwise
 *
 * @throws ProjectNotFoundError When the project does not exist, or belongs to another namespace
 */
export async function deleteProjectUseCase(
    repository: ProjectsRepository,
    runtime: ContainerRuntime,
    namespaceId: string,
    id: string,
): Promise<boolean> {
    const project = await repository.findById(id);

    if (project?.namespaceId !== namespaceId) {
        throw new ProjectNotFoundError(id);
    }

    const prefix = getProjectNetworkDaemonPrefixUseCase(id);
    const daemonNetworks = await runtime.listNetworks({});

    for (const network of daemonNetworks.filter((daemonNetwork) => daemonNetwork.name.startsWith(prefix))) {
        await runtime.removeNetwork(network.name);
    }

    return repository.delete(id);
}
