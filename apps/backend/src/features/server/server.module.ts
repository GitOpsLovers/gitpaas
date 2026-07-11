import { Module } from '@nestjs/common';

import { DockerServerPrunerRepository } from './infrastructure/docker/docker-server-pruner.repository';
import { ServerController } from './ui/controllers/server.controller';
import { ServerService } from './ui/services/server.service';

@Module({
    controllers: [ServerController],
    providers: [ServerService, DockerServerPrunerRepository],
})

/**
 * Server module
 */
export class ServerModule {}
