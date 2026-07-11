import { Injectable } from '@nestjs/common';

import { pruneContainersUseCase } from '../../application/prune-containers.use-case';
import { pruneImagesUseCase } from '../../application/prune-images.use-case';
import { pruneVolumesUseCase } from '../../application/prune-volumes.use-case';
import { PruneResult } from '../../domain/models/prune-result.model';
import { DockerServerPrunerRepository } from '../../infrastructure/docker/docker-server-pruner.repository';

@Injectable()

/**
 * Server service
 */
export class ServerService {
    constructor(private readonly pruner: DockerServerPrunerRepository) {}

    /**
     * Removes dangling images from the VPS
     *
     * @returns Number of images removed and disk space reclaimed
     */
    public pruneImages(): Promise<PruneResult> {
        return pruneImagesUseCase(this.pruner);
    }

    /**
     * Removes unused local volumes from the VPS
     *
     * @returns Number of volumes removed and disk space reclaimed
     */
    public pruneVolumes(): Promise<PruneResult> {
        return pruneVolumesUseCase(this.pruner);
    }

    /**
     * Removes stopped containers from the VPS
     *
     * @returns Number of containers removed and disk space reclaimed
     */
    public pruneContainers(): Promise<PruneResult> {
        return pruneContainersUseCase(this.pruner);
    }
}
