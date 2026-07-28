import { Inject, Injectable } from '@nestjs/common';

import { checkReadinessUseCase } from '../../application/check-readiness.use-case';
import { pruneContainersUseCase } from '../../application/prune-containers.use-case';
import { pruneImagesUseCase } from '../../application/prune-images.use-case';
import { pruneVolumesUseCase } from '../../application/prune-volumes.use-case';
import { removeOrphanedContainersUseCase } from '../../application/remove-orphaned-containers.use-case';
import { OrphanRemovalResult } from '../../domain/models/orphan-removal-result.models';
import { PruneResult } from '../../domain/models/prune-result.models';
import { ReadinessResult } from '../../domain/models/readiness-result.models';
import type { HealthProbe } from '../../domain/ports/health-probe.port';
import type { OrphanContainers } from '../../domain/ports/orphan-containers.port';
import { OrphanContainersDockerAdapter } from '../../infrastructure/docker/orphan-containers-docker.adapter';
import { ServerPrunerDockerAdapter } from '../../infrastructure/docker/server-pruner-docker.adapter';
import { HealthProbeDockerAdapter } from '../../infrastructure/health/health-probe-docker.adapter';
import { HealthProbePostgresAdapter } from '../../infrastructure/health/health-probe-postgres.adapter';
import { HealthProbeRedisAdapter } from '../../infrastructure/health/health-probe-redis.adapter';

import type { ServicesRepository } from '@features/services/domain/repositories/services.repository';
import { ServicesDatabaseRepository } from '@features/services/infrastructure/database/services-db.repository';

/**
 * Server service
 */
@Injectable()
export class ServerService {
    constructor(
        private readonly pruner: ServerPrunerDockerAdapter,
        @Inject(OrphanContainersDockerAdapter)
        private readonly orphanContainers: OrphanContainers,
        @Inject(ServicesDatabaseRepository)
        private readonly services: ServicesRepository,
        @Inject(HealthProbePostgresAdapter)
        private readonly postgresProbe: HealthProbe,
        @Inject(HealthProbeRedisAdapter)
        private readonly redisProbe: HealthProbe,
        @Inject(HealthProbeDockerAdapter)
        private readonly dockerProbe: HealthProbe,
    ) {}

    /**
     * Removes dangling images from the server
     *
     * @returns Number of images removed and disk space reclaimed
     */
    public pruneImages(): Promise<PruneResult> {
        return pruneImagesUseCase(this.pruner);
    }

    /**
     * Removes unused local volumes from the server
     *
     * @returns Number of volumes removed and disk space reclaimed
     */
    public pruneVolumes(): Promise<PruneResult> {
        return pruneVolumesUseCase(this.pruner);
    }

    /**
     * Removes stopped containers from the server
     *
     * @returns Number of containers removed and disk space reclaimed
     */
    public pruneContainers(): Promise<PruneResult> {
        return pruneContainersUseCase(this.pruner);
    }

    /**
     * Force-removes orphaned GitPaaS containers from the server
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
