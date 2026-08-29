import { Network, NetworkStatus } from '../domain/models/network.models';
import { NetworksRepository } from '../domain/repositories/networks.repository';

import { ServiceNotFoundError } from '@features/services/domain/errors/service.errors';
import { ServicesRepository } from '@features/services/domain/repositories/services.repository';

/**
 * Merges the networks the stack of a service declares with the networks its containers hold.
 *
 * @param declared Networks the stack of the service declares
 * @param connected Networks the containers of the service hold
 *
 * @returns Networks of the service, each one with its state
 */
function mergeNetworks(declared: Network[], connected: Network[]): NetworkStatus[] {
    const declaredNames = new Set(declared.map((network) => network.name));
    const connectedNames = new Set(connected.map((network) => network.name));

    const fromStack = declared.map<NetworkStatus>((network) => ({
        ...network,
        state: connectedNames.has(network.name) ? 'attached' : 'declared',
    }));

    const fromContainers = connected
        .filter((network) => !declaredNames.has(network.name))
        .map<NetworkStatus>((network) => ({ ...network, state: 'connected' }));

    return [...fromStack, ...fromContainers];
}

/**
 * Use case for listing every network of a service: the ones its stack declares, and the ones its containers joined besides.
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

    return mergeNetworks(declared, connected);
}
