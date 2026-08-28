import type {
    OrphanRemovalResult,
    PlatformSettings,
    PruneResult,
    ReadinessResult,
    UpdatePlatformSettingsDto,
} from '@gitpaas/contracts';
import { Inject, Injectable } from '@nestjs/common';

import { checkReadinessUseCase } from '../../application/check-readiness.use-case';
import { getPlatformSettingsUseCase } from '../../application/get-platform-settings.use-case';
import { getServerStatusUseCase } from '../../application/get-server-status.use-case';
import { pruneContainersUseCase } from '../../application/prune-containers.use-case';
import { pruneImagesUseCase } from '../../application/prune-images.use-case';
import { pruneVolumesUseCase } from '../../application/prune-volumes.use-case';
import { removeOrphanedContainersUseCase } from '../../application/remove-orphaned-containers.use-case';
import { updatePlatformSettingsUseCase } from '../../application/update-platform-settings.use-case';
import type { HealthProbe } from '../../domain/ports/health-probe.port';
import type { OrphanContainers } from '../../domain/ports/orphan-containers.port';
import type { PlatformSettingsRepository } from '../../domain/repositories/platform-settings.repository';
import { DatabasePlatformSettingsRepository } from '../../infrastructure/database/db-platform-settings.repository';
import { DockerOrphanContainersAdapter } from '../../infrastructure/docker/docker-orphan-containers.adapter';
import { DockerServerPrunerAdapter } from '../../infrastructure/docker/docker-server-pruner.adapter';
import { BackendHealthProbeAdapter } from '../../infrastructure/health/backend-health-probe.adapter';
import { DockerHealthProbeAdapter } from '../../infrastructure/health/docker-health-probe.adapter';
import { FrontendHealthProbeAdapter } from '../../infrastructure/health/frontend-health-probe.adapter';
import { PostgresHealthProbeAdapter } from '../../infrastructure/health/postgres-health-probe.adapter';
import { ProxyHealthProbeAdapter } from '../../infrastructure/health/proxy-health-probe.adapter';
import { RedisHealthProbeAdapter } from '../../infrastructure/health/redis-health-probe.adapter';

import { ContainerRuntimeInfo } from '@core/domain/models/container-runtime.models';
import type { ContainerRuntime } from '@core/domain/ports/container-runtime.port';
import { DockerContainerRuntimeAdapter } from '@core/infrastructure/docker/docker-container-runtime.adapter';
import type { ServicesRepository } from '@features/services/domain/repositories/services.repository';
import { DatabaseServicesRepository } from '@features/services/infrastructure/database/db-services.repository';

/**
 * Server service
 */
@Injectable()
export class ServerService {
    constructor(
        private readonly pruner: DockerServerPrunerAdapter,
        @Inject(DockerOrphanContainersAdapter)
        private readonly orphanContainers: OrphanContainers,
        @Inject(DatabaseServicesRepository)
        private readonly services: ServicesRepository,
        @Inject(PostgresHealthProbeAdapter)
        private readonly postgresProbe: HealthProbe,
        @Inject(DockerHealthProbeAdapter)
        private readonly dockerProbe: HealthProbe,
        @Inject(RedisHealthProbeAdapter)
        private readonly redisProbe: HealthProbe,
        @Inject(ProxyHealthProbeAdapter)
        private readonly proxyProbe: HealthProbe,
        @Inject(BackendHealthProbeAdapter)
        private readonly backendProbe: HealthProbe,
        @Inject(FrontendHealthProbeAdapter)
        private readonly frontendProbe: HealthProbe,
        @Inject(DockerContainerRuntimeAdapter)
        private readonly containerRuntime: ContainerRuntime,
        @Inject(DatabasePlatformSettingsRepository)
        private readonly settings: PlatformSettingsRepository,
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
     * Probes the server's critical dependencies and reports each one's reachability alongside an aggregate status.
     *
     * @returns Overall readiness status and a per-dependency breakdown
     */
    public checkReadiness(): Promise<ReadinessResult> {
        return checkReadinessUseCase([
            this.postgresProbe,
            this.dockerProbe,
            this.redisProbe,
            this.proxyProbe,
            this.backendProbe,
            this.frontendProbe,
        ]);
    }

    /**
     * Reads the information reported by the server's Docker daemon
     *
     * @returns Daemon information
     */
    public getStatus(): Promise<ContainerRuntimeInfo> {
        return getServerStatusUseCase(this.containerRuntime);
    }

    /**
     * Reads the parameters of the deployment system.
     *
     * @returns Parameters of the deployment system
     */
    public getSettings(): Promise<PlatformSettings> {
        return getPlatformSettingsUseCase(this.settings);
    }

    /**
     * Writes the parameters of the deployment system
     *
     * @param updateDto Parameters to keep
     *
     * @returns Parameters the system keeps
     */
    public updateSettings(updateDto: UpdatePlatformSettingsDto): Promise<PlatformSettings> {
        return updatePlatformSettingsUseCase(this.settings, updateDto);
    }
}
