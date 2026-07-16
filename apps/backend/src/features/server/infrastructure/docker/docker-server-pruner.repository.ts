import { Injectable } from '@nestjs/common';

import { PruneResult } from '../../domain/models/prune-result.model';
import { ServerPrunerRepository } from '../../domain/repositories/server-pruner.repository';

import { toPruneResult } from './docker-server-pruner.transformer';

import { DockerClient } from '@core/infrastructure/docker/docker.client';

/**
 * Docker server pruner repository
 */
@Injectable()
export class DockerServerPrunerRepository implements ServerPrunerRepository {
    constructor(private readonly client: DockerClient) {}

    /**
     * Removes dangling images, mirroring `docker image prune`.
     *
     * @returns Number of images removed and disk space reclaimed
     */
    public async pruneImages(): Promise<PruneResult> {
        const { ImagesDeleted, SpaceReclaimed } = await this.client.getClient().pruneImages();

        return toPruneResult(ImagesDeleted, SpaceReclaimed);
    }

    /**
     * Removes unused local volumes, mirroring `docker volume prune`.
     *
     * @returns Number of volumes removed and disk space reclaimed
     */
    public async pruneVolumes(): Promise<PruneResult> {
        const { VolumesDeleted, SpaceReclaimed } = await this.client.getClient().pruneVolumes();

        return toPruneResult(VolumesDeleted, SpaceReclaimed);
    }

    /**
     * Removes stopped containers, mirroring `docker container prune`.
     *
     * @returns Number of containers removed and disk space reclaimed
     */
    public async pruneContainers(): Promise<PruneResult> {
        const { ContainersDeleted, SpaceReclaimed } = await this.client.getClient().pruneContainers();

        return toPruneResult(ContainersDeleted, SpaceReclaimed);
    }
}
