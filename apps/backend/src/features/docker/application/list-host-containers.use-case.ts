import { HOST_SELECTOR } from '../domain/constants/docker-host.constants';

import { RuntimeContainerSummary } from '@core/domain/models/container-runtime.models';
import { ContainerRuntime } from '@core/domain/ports/container-runtime.port';

/**
 * Use case for listing every container of the Docker host, the stopped ones included.
 *
 * @param runtime Container runtime port
 *
 * @returns Summaries of the containers of the host
 */
export function listHostContainersUseCase(runtime: ContainerRuntime): Promise<RuntimeContainerSummary[]> {
    return runtime.listContainers(HOST_SELECTOR, true);
}
