import { Inject, Injectable } from '@nestjs/common';

import { ContainerRuntimeInfo } from '../../domain/models/container-runtime.models';
import type { ContainerRuntime } from '../../domain/ports/container-runtime.port';
import { DockerContainerRuntimeAdapter } from '../../infrastructure/docker/container-runtime-docker.adapter';

/**
 * Container runtime service
 */
@Injectable()
export class ContainerRuntimeService {
    constructor(@Inject(DockerContainerRuntimeAdapter) private readonly client: ContainerRuntime) {}

    /**
     * Returns `true` when the daemon answers a ping.
     */
    public async ping(): Promise<boolean> {
        return this.client.ping();
    }

    /**
     * Returns the daemon's information.
     */
    public async info(): Promise<ContainerRuntimeInfo> {
        return this.client.info();
    }
}
