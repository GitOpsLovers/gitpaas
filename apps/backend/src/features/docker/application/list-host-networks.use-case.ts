import { HOST_SELECTOR } from '../domain/constants/docker-host.constants';

import { RuntimeNetworkSummary } from '@core/domain/models/container-runtime.models';
import { ContainerRuntime } from '@core/domain/ports/container-runtime.port';

/**
 * Use case for listing every network of the Docker host.
 *
 * @param runtime Container runtime port
 *
 * @returns Summaries of the networks of the host
 */
export function listHostNetworksUseCase(runtime: ContainerRuntime): Promise<RuntimeNetworkSummary[]> {
    return runtime.listNetworks(HOST_SELECTOR);
}
