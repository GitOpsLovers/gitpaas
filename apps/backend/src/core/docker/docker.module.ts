import { Global, Module } from '@nestjs/common';

import { DockerController } from './ui/controllers/docker.controller';
import { DockerService } from './ui/services/docker.service';

@Global()
@Module({
    controllers: [DockerController],
    providers: [DockerService],
    exports: [DockerService],
})

/**
 * Docker module
 *
 * Exposes the Dockerode client to the whole application.
 */
export class DockerModule {}
