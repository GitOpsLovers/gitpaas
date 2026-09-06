import { HOST_SELECTOR } from '../domain/constants/docker-host.constants';

import { RuntimeImageSummary } from '@core/domain/models/container-runtime.models';
import { ContainerRuntime } from '@core/domain/ports/container-runtime.port';

/**
 * Use case for listing every image of the Docker host.
 *
 * @param runtime Container runtime port
 *
 * @returns Summaries of the images of the host
 */
export function listHostImagesUseCase(runtime: ContainerRuntime): Promise<RuntimeImageSummary[]> {
    return runtime.listImages(HOST_SELECTOR);
}
