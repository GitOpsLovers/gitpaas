import { Module } from '@nestjs/common';

import { DockerContainersRepository } from './infrastructure/docker/docker-containers.repository';
import { ContainersController } from './ui/controllers/containers.controller';
import { ContainersService } from './ui/services/containers.service';

import { ServicesModule } from '@features/services/services.module';

/**
 * Containers feature module.
 *
 * The feature's `DockerContainersRepository` obtains the core `DockerClient`
 * (exported by the globally-registered `DockerModule`) and lists a service's
 * compose containers.
 */
@Module({
    imports: [ServicesModule],
    controllers: [ContainersController],
    providers: [ContainersService, DockerContainersRepository],
})
export class ContainersModule {}
