import { Inject, Injectable } from '@nestjs/common';

import { checkReadinessUseCase } from '../../application/check-readiness.use-case';
import { pruneContainersUseCase } from '../../application/prune-containers.use-case';
import { pruneImagesUseCase } from '../../application/prune-images.use-case';
import { pruneVolumesUseCase } from '../../application/prune-volumes.use-case';
import { removeOrphanedContainersUseCase } from '../../application/remove-orphaned-containers.use-case';
import { OrphanRemovalResult } from '../../domain/models/orphan-removal-result.model';
import { PruneResult } from '../../domain/models/prune-result.model';
import { ReadinessResult } from '../../domain/models/readiness-result.model';
import type { HealthProbe } from '../../domain/repositories/health-probe.repository';
import type { OrphanContainersRepository } from '../../domain/repositories/orphan-containers.repository';
import { DockerOrphanContainersRepository } from '../../infrastructure/docker/docker-orphan-containers.repository';
import { DockerServerPrunerRepository } from '../../infrastructure/docker/docker-server-pruner.repository';
import { DockerHealthProbe } from '../../infrastructure/health/docker-health-probe.repository';
import { PostgresHealthProbe } from '../../infrastructure/health/postgres-health-probe.repository';
import { RedisHealthProbe } from '../../infrastructure/health/redis-health-probe.repository';

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
        @Inject(PostgresHealthProbe)
        private readonly postgresProbe: HealthProbe,
        @Inject(RedisHealthProbe)
        private readonly redisProbe: HealthProbe,
        @Inject(DockerHealthProbe)
        private readonly dockerProbe: HealthProbe,
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

    /**
     * Probes the server's critical dependencies (PostgreSQL, Redis, Docker) and
     * reports each one's reachability alongside an aggregate status.
     *
     * @returns Overall readiness status and a per-dependency breakdown
     */
    public checkReadiness(): Promise<ReadinessResult> {
        return checkReadinessUseCase([this.postgresProbe, this.redisProbe, this.dockerProbe]);
    }
}
