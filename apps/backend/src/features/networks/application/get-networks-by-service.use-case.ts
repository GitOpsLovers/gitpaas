import { Network, NetworkStatus } from '../domain/models/network.models';
import { ProjectNetwork } from '../domain/models/project-network.models';
import { NetworksRepository } from '../domain/repositories/networks.repository';
import { ProjectNetworksRepository } from '../domain/repositories/project-networks.repository';
import { ServiceNetworksRepository } from '../domain/repositories/service-networks.repository';

import { ServiceNotFoundError } from '@features/services/domain/errors/service.errors';
import { ServicesRepository } from '@features/services/domain/repositories/services.repository';

/**
 * Gives the networks the stack of a service declares their state, from the networks its containers hold.
 *
 * @param declared Networks the stack of the service declares
 * @param connectedNames Names of the networks the containers of the service hold
 *
 * @returns Networks of the stack, each one with its state
 */
function toStackNetworks(declared: Network[], connectedNames: Set<string>): NetworkStatus[] {
    return declared.map<NetworkStatus>((network) => ({
        ...network,
        state: connectedNames.has(network.name) ? 'attached' : 'declared',
    }));
}

/**
 * Gives the networks the containers hold besides the stack their state.
 *
 * @param connected Networks the containers of the service hold
 * @param declaredNames Names of the networks the stack of the service declares
 * @param projectNetworks Networks of the project, by the name they carry on the daemon
 * @param joinedNames Names on the daemon of the networks of the project the service joined
 *
 * @returns Networks of the containers, each one with its state
 */
function toContainerNetworks(
    connected: Network[],
    declaredNames: Set<string>,
    projectNetworks: Map<string, ProjectNetwork>,
    joinedNames: Set<string>,
): NetworkStatus[] {
    return connected
        .filter((network) => !declaredNames.has(network.name))
        .map<NetworkStatus>((network) => {
            const projectNetwork = projectNetworks.get(network.name);

            if (!projectNetwork) {
                return { ...network, state: 'connected' };
            }

            return {
                ...network,
                name: projectNetwork.name,
                state: joinedNames.has(network.name) ? 'connected' : 'leaving',
            };
        });
}

/**
 * Reads the network of the daemon behind a join that no container holds yet.
 *
 * @param networksRepository Networks repository
 * @param join Network of the project the service joined
 *
 * @returns Network of the project in the state `joining`, with the values of the daemon when it holds it
 */
async function toJoiningNetwork(
    networksRepository: NetworksRepository,
    join: ProjectNetwork,
): Promise<NetworkStatus> {
    const daemonNetwork = await networksRepository.findByName(join.daemonName);

    return {
        ...daemonNetwork, id: join.id, name: join.name, state: 'joining',
    };
}

/**
 * Use case for listing every network of a service.
 *
 * @param servicesRepository Services repository
 * @param networksRepository Networks repository
 * @param serviceNetworksRepository Service networks repository, which holds the joins of the service
 * @param projectNetworksRepository Project networks repository
 * @param serviceId Identifier of the service the networks belong to
 *
 * @returns Networks of the service, each one with its state
 *
 * @throws ServiceNotFoundError When no service carries that id
 */
export async function getNetworksByServiceUseCase(
    servicesRepository: ServicesRepository,
    networksRepository: NetworksRepository,
    serviceNetworksRepository: ServiceNetworksRepository,
    projectNetworksRepository: ProjectNetworksRepository,
    serviceId: string,
): Promise<NetworkStatus[]> {
    const service = await servicesRepository.findById(serviceId);

    if (!service) {
        throw new ServiceNotFoundError(serviceId);
    }

    const [declared, connected, joins, projectNetworks] = await Promise.all([
        networksRepository.listByService(service),
        networksRepository.listConnectedByService(service),
        serviceNetworksRepository.listByService(serviceId),
        projectNetworksRepository.listByProject(service.projectId),
    ]);

    const declaredNames = new Set(declared.map((network) => network.name));
    const connectedNames = new Set(connected.map((network) => network.name));
    const joinedNames = new Set(joins.map((join) => join.daemonName));
    const networksByDaemonName = new Map(projectNetworks.map((network) => [network.daemonName, network]));

    const joining = await Promise.all(
        joins
            .filter((join) => !connectedNames.has(join.daemonName))
            .map((join) => toJoiningNetwork(networksRepository, join)),
    );

    return [
        ...toStackNetworks(declared, connectedNames),
        ...toContainerNetworks(connected, declaredNames, networksByDaemonName, joinedNames),
        ...joining,
    ];
}
