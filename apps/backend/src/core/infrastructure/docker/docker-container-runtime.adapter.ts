import { Inject, Injectable } from '@nestjs/common';
import Docker from 'dockerode';
import DockerodeCompose from 'dockerode-compose';

import { RemoveContainerDto } from '../../domain/dtos/remove-container.dto';
import { RemoveImageDto } from '../../domain/dtos/remove-image.dto';
import type {
    ContainerRuntimeInfo,
    RuntimeBuildImageOptions,
    RuntimeComposeProject,
    RuntimeContainerSummary,
    RuntimeDetachedContainerOptions,
    RuntimeImageSummary,
    RuntimeNetworkSummary,
    RuntimeProgressCompletion,
    RuntimeProgressListener,
    RuntimeProgressStream,
    RuntimePruneReport,
    RuntimeSelector,
} from '../../domain/models/container-runtime.models';
import type { AppLogger } from '../../domain/ports/app-logger.port';
import type { ContainerRuntime } from '../../domain/ports/container-runtime.port';
import { NestLoggerAdapter } from '../logging/nest-logger.adapter';
import { recordDependencyCall } from '../telemetry/telemetry-deps';

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
    private client: Docker | undefined;

    constructor(@Inject(NestLoggerAdapter) private readonly logger: AppLogger) {}

    public async ping(): Promise<boolean> {
        const response = await this.run(() => this.getClient().ping());

        return response.toString() === 'OK';
    }

    public async info(): Promise<ContainerRuntimeInfo> {
        const info = await this.run(() => this.getClient().info());

        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        return toContainerRuntimeInfo(info);
    }

    public async listContainers(selector: RuntimeSelector, all = false): Promise<RuntimeContainerSummary[]> {
        const filters = toLabelFilter(selector);
        const containers = await this.run(() => this.getClient().listContainers({ all, filters }));

        return containers.map((container) => toContainerSummary(container));
    }

    public async removeContainer(id: string, options: RemoveContainerDto = {}): Promise<void> {
        await this.run(() => this.getClient().getContainer(id).remove({ force: options.force ?? false, v: options.removeVolumes ?? false }));
    }

    public async listNetworks(selector: RuntimeSelector): Promise<RuntimeNetworkSummary[]> {
        const filters = toLabelFilter(selector);
        const networks = await this.run(() => this.getClient().listNetworks({ filters }));

        return networks.map((network) => toNetworkSummary(network));
    }

    public async removeNetwork(id: string): Promise<void> {
        await this.run(() => this.getClient().getNetwork(id).remove());
    }

    public async connectNetwork(network: string, containerId: string): Promise<void> {
        await this.run(() => this.getClient().getNetwork(network).connect({ Container: containerId }));
    }

    public async disconnectNetwork(network: string, containerId: string): Promise<void> {
        await this.run(() => this.getClient().getNetwork(network).disconnect({ Container: containerId, Force: true }));
    }

    public async listImages(selector: RuntimeSelector): Promise<RuntimeImageSummary[]> {
        const filters = toLabelFilter(selector);
        const images = await this.run(() => this.getClient().listImages({ filters }));

        return images.map((image) => toImageSummary(image));
    }

    public async removeImage(id: string, options: RemoveImageDto = {}): Promise<void> {
        await this.run(() => this.getClient().getImage(id).remove({ force: options.force ?? false }));
    }

    public async pruneImages(selector: RuntimeSelector): Promise<RuntimePruneReport> {
        const filters = toLabelFilter(selector);
        const { ImagesDeleted, SpaceReclaimed } = await this.run(() => this.getClient().pruneImages({ filters }));

        return toPruneReport(ImagesDeleted, SpaceReclaimed);
    }

    public async pruneVolumes(selector: RuntimeSelector): Promise<RuntimePruneReport> {
        const filters = toLabelFilter(selector);
        const { VolumesDeleted, SpaceReclaimed } = await this.run(() => this.getClient().pruneVolumes({ filters }));

        return toPruneReport(VolumesDeleted, SpaceReclaimed);
    }

    public async pruneContainers(selector: RuntimeSelector): Promise<RuntimePruneReport> {
        const filters = toLabelFilter(selector);
        const { ContainersDeleted, SpaceReclaimed } = await this.run(() => this.getClient().pruneContainers({ filters }));

        return toPruneReport(ContainersDeleted, SpaceReclaimed);
    }

    public async buildImage(context: NodeJS.ReadableStream, options: RuntimeBuildImageOptions): Promise<RuntimeProgressStream> {
        return this.run(() => this.getClient().buildImage(context, {
            t: options.tag,
            dockerfile: options.dockerfile,
            buildargs: options.buildArgs,
            target: options.target,
            labels: options.labels,
        }));
    }

    public async pullImage(reference: string): Promise<RuntimeProgressStream> {
        return this.run(() => this.getClient().pull(reference));
    }

    public followProgress(stream: RuntimeProgressStream, onFinished: RuntimeProgressCompletion, onProgress: RuntimeProgressListener): void {
        this.getClient().modem.followProgress(stream, onFinished, onProgress);
    }

    public async runDetachedContainer(options: RuntimeDetachedContainerOptions): Promise<string> {
        const container = await this.run(() => this.getClient().createContainer({
            Image: options.image,
            Cmd: options.command,
            name: options.name,
            Labels: options.labels,
            HostConfig: {
                Binds: options.binds,
                AutoRemove: options.removeOnExit ?? false,
            },
        }));

        await this.run(() => container.start());

        return container.id;
    }

    public createComposeProject(composeFilePath: string, projectName: string): RuntimeComposeProject {
        return new DockerodeCompose(this.getClient(), composeFilePath, projectName);
    }

    /**
     * Runs a call against the Docker daemon, counting it on the telemetry event of the current unit of work.
     *
     * @param operation Docker call to run
     *
     * @returns Whatever the operation resolves to
     */
    private async run<T>(operation: () => Promise<T>): Promise<T> {
        const startedAt = performance.now();

        try {
            const result = await operation();

            recordDependencyCall('docker', performance.now() - startedAt, false);

            return result;
        } catch (error) {
            recordDependencyCall('docker', performance.now() - startedAt, true);

            throw error;
        }
    }

    /**
     * Lazily-created, reused Dockerode client bound to the local daemon socket.
     *
     * @returns Dockerode client connected to the local Docker daemon
     */
    private getClient(): Docker {
        this.client ??= this.createClient();

        return this.client;
    }

    /**
     * Creates a new Dockerode client
     */
    private createClient(): Docker {
        this.logger.log(`Connecting to the local Docker daemon at ${DOCKER_SOCKET_PATH}`, DockerContainerRuntimeAdapter.name);

        return new Docker({ socketPath: DOCKER_SOCKET_PATH });
    }
}
