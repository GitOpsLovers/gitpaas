import type { DockerContainer, DockerImage, DockerNetwork, DockerVolume } from '@gitpaas/contracts';
import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';

import { DockerService } from '../services/docker.service';
import {
    toDockerContainerResponse,
    toDockerImageResponse,
    toDockerNetworkResponse,
    toDockerVolumeResponse,
} from '../transformers/docker-response.transformer';

import { DaemonUnreachableError } from '@core/domain/errors/container-runtime.errors';
import { translateError } from '@core/ui/translators/http-error.translator';

/**
 * Docker controller
 */
@Controller('docker')
export class DockerController {
    constructor(private readonly service: DockerService) {}

    /**
     * List every container of the Docker host, the stopped ones included.
     *
     * @returns Containers of the host
     */
    @Get('containers')
    public listContainers(): Promise<DockerContainer[]> {
        return this.list(() => this.service.listContainers(), toDockerContainerResponse);
    }

    /**
     * List every image of the Docker host.
     *
     * @returns Images of the host
     */
    @Get('images')
    public listImages(): Promise<DockerImage[]> {
        return this.list(() => this.service.listImages(), toDockerImageResponse);
    }

    /**
     * List every volume of the Docker host.
     *
     * @returns Volumes of the host
     */
    @Get('volumes')
    public listVolumes(): Promise<DockerVolume[]> {
        return this.list(() => this.service.listVolumes(), toDockerVolumeResponse);
    }

    /**
     * List every network of the Docker host.
     *
     * @returns Networks of the host
     */
    @Get('networks')
    public listNetworks(): Promise<DockerNetwork[]> {
        return this.list(() => this.service.listNetworks(), toDockerNetworkResponse);
    }

    /**
     * Read a resource of the Docker host, and translate a daemon that does not answer into a `503`.
     *
     * @param read Reads the summaries of the resource from the daemon
     * @param toResponse Maps one summary into the shape the answer of the API carries
     *
     * @returns Resources of the host, on the wire
     */
    private async list<TSummary, TResponse>(
        read: () => Promise<TSummary[]>,
        toResponse: (summary: TSummary) => TResponse,
    ): Promise<TResponse[]> {
        try {
            const summaries = await read();

            return summaries.map(toResponse);
        } catch (error) {
            if (error instanceof DaemonUnreachableError) {
                throw new ServiceUnavailableException(
                    'Could not reach the server Docker daemon. Verify the server is running and reachable.',
                    { cause: error },
                );
            }

            throw translateError(error);
        }
    }
}
