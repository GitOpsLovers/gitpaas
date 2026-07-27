import { Module } from '@nestjs/common';

import { DockerOrphanContainersRepository } from './infrastructure/docker/orphan-containers-docker.repository';
import { DockerServerPrunerRepository } from './infrastructure/docker/server-pruner-docker.repository';
import { DockerHealthProbe } from './infrastructure/health/health-probe-docker.repository';
import { PostgresHealthProbe } from './infrastructure/health/health-probe-postgres.repository';
import { RedisHealthProbe } from './infrastructure/health/health-probe-redis.repository';
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
