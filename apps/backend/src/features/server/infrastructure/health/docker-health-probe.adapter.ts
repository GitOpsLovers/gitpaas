import { Inject, Injectable } from '@nestjs/common';

import { HealthProbe } from '../../domain/ports/health-probe.port';

import type { ContainerRuntime } from '@core/domain/ports/container-runtime.port';
import { DockerContainerRuntimeAdapter } from '@core/infrastructure/docker/docker-container-runtime.adapter';

/**
 * Docker daemon health probe.
 */
@Injectable()
export class DockerHealthProbeAdapter implements HealthProbe {
    public readonly name = 'docker';

    constructor(@Inject(DockerContainerRuntimeAdapter) private readonly client: ContainerRuntime) {}

    /**
     * Probes the Docker daemon connectivity.
     *
     * @returns `true` when the daemon answers the ping, `false` otherwise
     */
    public async check(): Promise<boolean> {
        try {
            await this.client.ping();

            return true;
        } catch {
            return false;
        }
    }
}
