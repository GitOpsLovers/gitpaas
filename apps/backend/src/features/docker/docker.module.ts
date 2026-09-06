import { Module } from '@nestjs/common';

import { DockerController } from './ui/controllers/docker.controller';
import { DockerService } from './ui/services/docker.service';

/**
 * Docker feature module.
 */
@Module({
    controllers: [DockerController],
    providers: [DockerService],
})
export class DockerModule {}
