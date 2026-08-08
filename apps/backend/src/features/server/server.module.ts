import { Module } from '@nestjs/common';

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
    imports: [ServicesModule],
    controllers: [ServerController],
    providers: [
        ServerService,
        DockerServerPrunerAdapter,
        DockerOrphanContainersAdapter,
        PostgresHealthProbeAdapter,
        DockerHealthProbeAdapter,
    ],
})
export class ServerModule {}
