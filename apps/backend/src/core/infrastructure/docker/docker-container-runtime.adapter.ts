import { Injectable, Logger } from '@nestjs/common';
import Docker from 'dockerode';

import { RemoveContainerDto } from '../../domain/dtos/remove-container.dto';
import { RemoveImageDto } from '../../domain/dtos/remove-image.dto';
import type {
    ContainerRuntimeInfo,
    RuntimeContainerSummary,
    RuntimeImageSummary,
    RuntimeNetworkSummary,
    RuntimePruneReport,
    RuntimeSelector,
} from '../../domain/models/container-runtime.models';
import type { ContainerRuntime } from '../../domain/ports/container-runtime.port';

import {
    toContainerRuntimeInfo,
    toContainerSummary,
    toImageSummary,
    toLabelFilter,
    toNetworkSummary,
    toPruneReport,
} from './docker-container-runtime.transformer';

/**
 * Unix socket of the local Docker daemon.
 * */
const DOCKER_SOCKET_PATH = '/var/run/docker.sock';

/**
 * Docker container runtime adapter.
 */
@Injectable()
export class DockerContainerRuntimeAdapter implements ContainerRuntime {
    private readonly logger = new Logger(DockerContainerRuntimeAdapter.name);

    private client: Docker | undefined;

    public getClient(): Docker {
        this.client ??= this.createClient();

        return this.client;
    }

    public async ping(): Promise<boolean> {
        const response = await this.getClient().ping();

        return response.toString() === 'OK';
    }

    public async info(): Promise<ContainerRuntimeInfo> {
        return toContainerRuntimeInfo(await this.getClient().info());
    }

    public async listContainers(selector: RuntimeSelector, all = false): Promise<RuntimeContainerSummary[]> {
        const filters = toLabelFilter(selector);
        const containers = await this.getClient().listContainers({ all, filters });

        return containers.map((container) => toContainerSummary(container));
    }

    public async removeContainer(id: string, options: RemoveContainerDto = {}): Promise<void> {
        await this.getClient().getContainer(id).remove({ force: options.force ?? false, v: options.removeVolumes ?? false });
    }

    public async listNetworks(selector: RuntimeSelector): Promise<RuntimeNetworkSummary[]> {
        const filters = toLabelFilter(selector);
        const networks = await this.getClient().listNetworks({ filters });

        return networks.map((network) => toNetworkSummary(network));
    }

    public async removeNetwork(id: string): Promise<void> {
        await this.getClient().getNetwork(id).remove();
    }

    public async listImages(selector: RuntimeSelector): Promise<RuntimeImageSummary[]> {
        const filters = toLabelFilter(selector);
        const images = await this.getClient().listImages({ filters });

        return images.map((image) => toImageSummary(image));
    }

    public async removeImage(id: string, options: RemoveImageDto = {}): Promise<void> {
        await this.getClient().getImage(id).remove({ force: options.force ?? false });
    }

    public async pruneImages(selector: RuntimeSelector): Promise<RuntimePruneReport> {
        const filters = toLabelFilter(selector);
        const { ImagesDeleted, SpaceReclaimed } = await this.getClient().pruneImages({ filters });

        return toPruneReport(ImagesDeleted, SpaceReclaimed);
    }

    public async pruneVolumes(selector: RuntimeSelector): Promise<RuntimePruneReport> {
        const filters = toLabelFilter(selector);
        const { VolumesDeleted, SpaceReclaimed } = await this.getClient().pruneVolumes({ filters });

        return toPruneReport(VolumesDeleted, SpaceReclaimed);
    }

    public async pruneContainers(selector: RuntimeSelector): Promise<RuntimePruneReport> {
        const filters = toLabelFilter(selector);
        const { ContainersDeleted, SpaceReclaimed } = await this.getClient().pruneContainers({ filters });

        return toPruneReport(ContainersDeleted, SpaceReclaimed);
    }

    /**
     * Creates a new Dockerode client
     */
    private createClient(): Docker {
        this.logger.log(`Connecting to the local Docker daemon at ${DOCKER_SOCKET_PATH}`);

        return new Docker({ socketPath: DOCKER_SOCKET_PATH });
    }
}
