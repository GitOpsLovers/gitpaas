import { Module } from '@nestjs/common';

import { DockerOrphanContainersRepository } from './infrastructure/docker/docker-orphan-containers.repository';
import { DockerServerPrunerRepository } from './infrastructure/docker/docker-server-pruner.repository';
import { DockerHealthProbe } from './infrastructure/health/docker-health-probe.repository';
import { PostgresHealthProbe } from './infrastructure/health/postgres-health-probe.repository';
import { RedisHealthProbe } from './infrastructure/health/redis-health-probe.repository';
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
        DockerServerPrunerRepository,
        DockerOrphanContainersRepository,
        PostgresHealthProbe,
        RedisHealthProbe,
        DockerHealthProbe,
    ],
})
export class ServerModule {}
