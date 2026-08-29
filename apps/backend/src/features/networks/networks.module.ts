import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DbProjectNetworkEntity } from './infrastructure/database/db-project-network.entity';
import { DatabaseProjectNetworksRepository } from './infrastructure/database/db-project-networks.repository';
import { DbServiceNetworkEntity } from './infrastructure/database/db-service-network.entity';
import { DatabaseServiceNetworksRepository } from './infrastructure/database/db-service-networks.repository';
import { DockerNetworksRepository } from './infrastructure/docker/docker-networks.repository';
import { NetworksController } from './ui/controllers/networks.controller';
import { NetworksService } from './ui/services/networks.service';

import { ServicesModule } from '@features/services/services.module';

/**
 * Networks feature module.
 */
@Module({
    imports: [ServicesModule, TypeOrmModule.forFeature([DbProjectNetworkEntity, DbServiceNetworkEntity])],
    controllers: [NetworksController],
    providers: [
        NetworksService,
        DockerNetworksRepository,
        DatabaseProjectNetworksRepository,
        DatabaseServiceNetworksRepository,
    ],
    exports: [DatabaseProjectNetworksRepository, DatabaseServiceNetworksRepository],
})
export class NetworksModule {}
