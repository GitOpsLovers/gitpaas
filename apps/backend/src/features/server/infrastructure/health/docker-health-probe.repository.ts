import { Injectable } from '@nestjs/common';

import { HealthProbe } from '../../domain/repositories/health-probe.repository';

import { DockerClient } from '@core/infrastructure/docker/docker.client';

/**
 * Docker daemon health probe.
 *
 * Probes the daemon with a `ping`, reporting `down` on any error — including the
 * `ServiceUnavailableException` `getClient()` throws when TLS certs are missing.
 */
@Injectable()
export class DockerHealthProbe implements HealthProbe {
    public readonly name = 'docker';

    constructor(private readonly client: DockerClient) {}

    /**
     * Probes the Docker daemon connectivity.
     *
     * @returns `true` when the daemon answers the ping, `false` otherwise
     */
    public async check(): Promise<boolean> {
        try {
            await this.client.getClient().ping();

            return true;
        } catch {
            return false;
        }
    }
}
