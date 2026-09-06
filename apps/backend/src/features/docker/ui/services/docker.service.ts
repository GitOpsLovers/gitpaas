import { Inject, Injectable } from '@nestjs/common';

import { listHostContainersUseCase } from '../../application/list-host-containers.use-case';
import { listHostImagesUseCase } from '../../application/list-host-images.use-case';
import { listHostNetworksUseCase } from '../../application/list-host-networks.use-case';
import { listHostVolumesUseCase } from '../../application/list-host-volumes.use-case';

import type {
    RuntimeContainerSummary,
    RuntimeImageSummary,
    RuntimeNetworkSummary,
    RuntimeVolumeSummary,
} from '@core/domain/models/container-runtime.models';
import type { ContainerRuntime } from '@core/domain/ports/container-runtime.port';
import { DockerContainerRuntimeAdapter } from '@core/infrastructure/docker/docker-container-runtime.adapter';

/**
 * Docker service
 */
@Injectable()
export class DockerService {
    constructor(
        @Inject(DockerContainerRuntimeAdapter)
        private readonly runtime: ContainerRuntime,
    ) {}

    /**
     * List every container of the Docker host, the stopped ones included.
     *
     * @returns Summaries of the containers of the host
     */
    public listContainers(): Promise<RuntimeContainerSummary[]> {
        return listHostContainersUseCase(this.runtime);
    }

    /**
     * List every image of the Docker host.
     *
     * @returns Summaries of the images of the host
     */
    public listImages(): Promise<RuntimeImageSummary[]> {
        return listHostImagesUseCase(this.runtime);
    }

    /**
     * List every volume of the Docker host.
     *
     * @returns Summaries of the volumes of the host
     */
    public listVolumes(): Promise<RuntimeVolumeSummary[]> {
        return listHostVolumesUseCase(this.runtime);
    }

    /**
     * List every network of the Docker host.
     *
     * @returns Summaries of the networks of the host
     */
    public listNetworks(): Promise<RuntimeNetworkSummary[]> {
        return listHostNetworksUseCase(this.runtime);
    }
}
