import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DbPlatformSettingsEntity } from './infrastructure/database/db-platform-settings.entity';
import { DatabasePlatformSettingsRepository } from './infrastructure/database/db-platform-settings.repository';
import { DockerOrphanContainersAdapter } from './infrastructure/docker/docker-orphan-containers.adapter';
import { DockerServerPrunerAdapter } from './infrastructure/docker/docker-server-pruner.adapter';
import { BackendHealthProbeAdapter } from './infrastructure/health/backend-health-probe.adapter';
import { DockerHealthProbeAdapter } from './infrastructure/health/docker-health-probe.adapter';
import { FrontendHealthProbeAdapter } from './infrastructure/health/frontend-health-probe.adapter';
import { PostgresHealthProbeAdapter } from './infrastructure/health/postgres-health-probe.adapter';
import { ProxyHealthProbeAdapter } from './infrastructure/health/proxy-health-probe.adapter';
import { RedisHealthProbeAdapter } from './infrastructure/health/redis-health-probe.adapter';
import { ServerController } from './ui/controllers/server.controller';
import { ServerService } from './ui/services/server.service';

import { ServicesModule } from '@features/services/services.module';

/**
 * Server module
 */
@Module({
    imports: [ServicesModule, TypeOrmModule.forFeature([DbPlatformSettingsEntity])],
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
    ],
})
export class ServerModule {}
