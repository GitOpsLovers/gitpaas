import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DbPlatformSettingsEntity } from './infrastructure/database/db-platform-settings.entity';
import { DatabasePlatformSettingsRepository } from './infrastructure/database/db-platform-settings.repository';
import { DockerOrphanContainersAdapter } from './infrastructure/docker/docker-orphan-containers.adapter';
import { DockerServerPrunerAdapter } from './infrastructure/docker/docker-server-pruner.adapter';
import { DockerHealthProbeAdapter } from './infrastructure/health/docker-health-probe.adapter';
import { PostgresHealthProbeAdapter } from './infrastructure/health/postgres-health-probe.adapter';
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
        DatabasePlatformSettingsRepository,
    ],
})
export class ServerModule {}
