import { HOST_SELECTOR } from '../domain/constants/docker-host.constants';

import { RuntimeVolumeSummary } from '@core/domain/models/container-runtime.models';
import { ContainerRuntime } from '@core/domain/ports/container-runtime.port';

/**
 * Use case for listing every volume of the Docker host.
 *
 * @param runtime Container runtime port
 *
 * @returns Summaries of the volumes of the host
 */
export function listHostVolumesUseCase(runtime: ContainerRuntime): Promise<RuntimeVolumeSummary[]> {
    return runtime.listVolumes(HOST_SELECTOR);
}
