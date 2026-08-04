import { Module } from '@nestjs/common';

import { DockerContainersRepository } from './infrastructure/docker/containers-docker.repository';
import { ContainersController } from './ui/controllers/containers.controller';
import { ContainersService } from './ui/services/containers.service';

import { ServicesModule } from '@features/services/services.module';

/**
 * Containers feature module.
 */
@Module({
    imports: [ServicesModule],
    controllers: [ContainersController],
    providers: [ContainersService, DockerContainersRepository],
})
export class ContainersModule {}
