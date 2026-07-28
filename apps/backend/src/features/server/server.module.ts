import { Module } from '@nestjs/common';

import { OrphanContainersDockerAdapter } from './infrastructure/docker/orphan-containers-docker.adapter';
import { ServerPrunerDockerAdapter } from './infrastructure/docker/server-pruner-docker.adapter';
import { HealthProbeDockerAdapter } from './infrastructure/health/health-probe-docker.adapter';
import { HealthProbePostgresAdapter } from './infrastructure/health/health-probe-postgres.adapter';
import { HealthProbeRedisAdapter } from './infrastructure/health/health-probe-redis.adapter';
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
        ServerPrunerDockerAdapter,
        OrphanContainersDockerAdapter,
        HealthProbePostgresAdapter,
        HealthProbeRedisAdapter,
        HealthProbeDockerAdapter,
    ],
})
export class ServerModule {}
