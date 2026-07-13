import { Global, Module } from '@nestjs/common';

import { DockerClient } from './infrastructure/docker.client';
import { DockerodeDockerExecutor } from './infrastructure/dockerode-docker.executor';
import { DockerController } from './ui/controllers/docker.controller';
import { DockerService } from './ui/services/docker.service';

/**
 * Docker module
 */
@Global()
@Module({
    controllers: [DockerController],
    providers: [DockerClient, DockerodeDockerExecutor, DockerService],
    exports: [DockerService, DockerodeDockerExecutor, DockerClient],
})
export class DockerModule {}
