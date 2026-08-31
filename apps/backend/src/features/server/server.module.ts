import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DbPlatformSettingsEntity } from './infrastructure/database/db-platform-settings.entity';
import { DatabasePlatformSettingsRepository } from './infrastructure/database/db-platform-settings.repository';
import { DbPlatformUpdateEntity } from './infrastructure/database/db-platform-update.entity';
import { DatabasePlatformUpdatesRepository } from './infrastructure/database/db-platform-updates.repository';
import { NodeDnsResolverAdapter } from './infrastructure/dns/node-dns-resolver.adapter';
import { DockerOrphanContainersAdapter } from './infrastructure/docker/docker-orphan-containers.adapter';
import { DockerServerPrunerAdapter } from './infrastructure/docker/docker-server-pruner.adapter';
import { DockerUpdateRunnerAdapter } from './infrastructure/docker/docker-update-runner.adapter';
import { FileControlPlaneEnvAdapter } from './infrastructure/env/file-control-plane-env.adapter';
import { BackendHealthProbeAdapter } from './infrastructure/health/backend-health-probe.adapter';
import { DockerHealthProbeAdapter } from './infrastructure/health/docker-health-probe.adapter';
import { FrontendHealthProbeAdapter } from './infrastructure/health/frontend-health-probe.adapter';
import { PostgresHealthProbeAdapter } from './infrastructure/health/postgres-health-probe.adapter';
import { ProxyHealthProbeAdapter } from './infrastructure/health/proxy-health-probe.adapter';
import { RedisHealthProbeAdapter } from './infrastructure/health/redis-health-probe.adapter';
import { HttpPublicHostAddressAdapter } from './infrastructure/network/http-public-host-address.adapter';
import { GithubReleaseSourceAdapter } from './infrastructure/release/github-release-source.adapter';
import { MemoryLatestReleaseStoreAdapter } from './infrastructure/release/memory-latest-release-store.adapter';
import { ServerController } from './ui/controllers/server.controller';
import { CheckLatestReleaseJob } from './ui/jobs/check-latest-release.job';
import { ServerService } from './ui/services/server.service';

import { ServicesModule } from '@features/services/services.module';

/**
 * Server module
 */
@Module({
    imports: [ServicesModule, TypeOrmModule.forFeature([DbPlatformSettingsEntity, DbPlatformUpdateEntity])],
    controllers: [ServerController],
    providers: [
        ServerService,
        DockerServerPrunerAdapter,
        DockerOrphanContainersAdapter,
        PostgresHealthProbeAdapter,
        DockerHealthProbeAdapter,
        RedisHealthProbeAdapter,
        ProxyHealthProbeAdapter,
        BackendHealthProbeAdapter,
        FrontendHealthProbeAdapter,
        DatabasePlatformSettingsRepository,
        DatabasePlatformUpdatesRepository,
        DockerUpdateRunnerAdapter,
        GithubReleaseSourceAdapter,
        MemoryLatestReleaseStoreAdapter,
        NodeDnsResolverAdapter,
        HttpPublicHostAddressAdapter,
        FileControlPlaneEnvAdapter,
        CheckLatestReleaseJob,
    ],
})
export class ServerModule {}
