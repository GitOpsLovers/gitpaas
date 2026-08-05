import { Module } from '@nestjs/common';

import { DockerNetworksRepository } from './infrastructure/docker/docker-networks.repository';
import { NetworksController } from './ui/controllers/networks.controller';
import { NetworksService } from './ui/services/networks.service';

import { ServicesModule } from '@features/services/services.module';

/**
 * Networks feature module.
 */
@Module({
    imports: [ServicesModule],
    controllers: [NetworksController],
    providers: [NetworksService, DockerNetworksRepository],
})
export class NetworksModule {}
