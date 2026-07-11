import { Global, Module } from '@nestjs/common';

import { DockerClient } from './infrastructure/docker.client';
import { DockerodeDockerExecutor } from './infrastructure/dockerode-docker.executor';
import { DockerController } from './ui/controllers/docker.controller';
import { DockerService } from './ui/services/docker.service';

@Global()
@Module({
    controllers: [DockerController],
    providers: [DockerClient, DockerodeDockerExecutor, DockerService],
    exports: [DockerService, DockerodeDockerExecutor],
})

/**
 * Docker module
 */
export class DockerModule {}
