import { Inject, Injectable } from '@nestjs/common';

import { pruneContainersUseCase } from '../../application/prune-containers.use-case';
import { pruneImagesUseCase } from '../../application/prune-images.use-case';
import { pruneVolumesUseCase } from '../../application/prune-volumes.use-case';
import { removeOrphanedContainersUseCase } from '../../application/remove-orphaned-containers.use-case';
import { OrphanRemovalResult } from '../../domain/models/orphan-removal-result.model';
import { PruneResult } from '../../domain/models/prune-result.model';
import type { OrphanContainersRepository } from '../../domain/repositories/orphan-containers.repository';
import { DockerOrphanContainersRepository } from '../../infrastructure/docker/docker-orphan-containers.repository';
import { DockerServerPrunerRepository } from '../../infrastructure/docker/docker-server-pruner.repository';

import type { ServicesRepository } from '@features/services/domain/repositories/services.repository';
import { ServicesDatabaseRepository } from '@features/services/infrastructure/database/services-db.repository';

/**
 * Server service
 */
@Injectable()
export class ServerService {
    constructor(
        private readonly pruner: DockerServerPrunerRepository,
        @Inject(DockerOrphanContainersRepository)
        private readonly orphanContainers: OrphanContainersRepository,
        @Inject(ServicesDatabaseRepository)
        private readonly services: ServicesRepository,
    ) {}

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

    /**
     * Force-removes orphaned Artifactory containers from the VPS
     *
     * @returns Number of orphaned containers removed and their names
     */
    public removeOrphanedContainers(): Promise<OrphanRemovalResult> {
        return removeOrphanedContainersUseCase(this.orphanContainers, this.services);
    }
}
