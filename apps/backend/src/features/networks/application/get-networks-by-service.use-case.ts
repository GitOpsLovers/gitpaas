import { Network, NetworkStatus } from '../domain/models/network.models';
import { NetworksRepository } from '../domain/repositories/networks.repository';

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
 *
 * @returns Networks of the containers, each one with its state
 */
function toContainerNetworks(connected: Network[], declaredNames: Set<string>): NetworkStatus[] {
    return connected
        .filter((network) => !declaredNames.has(network.name))
        .map<NetworkStatus>((network) => ({ ...network, state: 'connected' }));
}

/**
 * Use case for listing every network of a service.
 *
 * @param servicesRepository Services repository
 * @param networksRepository Networks repository
 * @param serviceId Identifier of the service the networks belong to
 *
 * @returns Networks of the service, each one with its state
 *
 * @throws ServiceNotFoundError When no service carries that id
 */
export async function getNetworksByServiceUseCase(
    servicesRepository: ServicesRepository,
    networksRepository: NetworksRepository,
    serviceId: string,
): Promise<NetworkStatus[]> {
    const service = await servicesRepository.findById(serviceId);

    if (!service) {
        throw new ServiceNotFoundError(serviceId);
    }

    const [declared, connected] = await Promise.all([
        networksRepository.listByService(service),
        networksRepository.listConnectedByService(service),
    ]);

    const declaredNames = new Set(declared.map((network) => network.name));
    const connectedNames = new Set(connected.map((network) => network.name));

    return [
        ...toStackNetworks(declared, connectedNames),
        ...toContainerNetworks(connected, declaredNames),
    ];
}
