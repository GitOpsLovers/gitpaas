import { Injectable } from '@nestjs/common';

import { DockerInfo } from '../../domain/models/docker.models';
import { DockerClient } from '../../infrastructure/docker/docker.client';

/**
 * Docker service
 */
@Injectable()
export class DockerService {
    constructor(private readonly client: DockerClient) {}

    /**
     * Returns `true` when the daemon answers a ping.
     */
    public async ping(): Promise<boolean> {
        const response = await this.client.getClient().ping();

        return response.toString() === 'OK';
    }

    /**
     * Returns the daemon's info (server version, container counts, etc.).
     */
    public info(): Promise<DockerInfo> {
        return this.client.getClient().info();
    }
}
