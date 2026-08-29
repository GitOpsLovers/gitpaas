import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DbProjectNetworkEntity } from './infrastructure/database/db-project-network.entity';
import { DatabaseProjectNetworksRepository } from './infrastructure/database/db-project-networks.repository';
import { DbServiceNetworkEntity } from './infrastructure/database/db-service-network.entity';
import { DatabaseServiceNetworksRepository } from './infrastructure/database/db-service-networks.repository';
import { DockerNetworksRepository } from './infrastructure/docker/docker-networks.repository';
import { NetworksController } from './ui/controllers/networks.controller';
import { ProjectNetworksController } from './ui/controllers/project-networks.controller';
import { NetworksService } from './ui/services/networks.service';
import { ProjectNetworksService } from './ui/services/project-networks.service';

import { ProjectsModule } from '@features/projects/projects.module';
import { ServicesModule } from '@features/services/services.module';

/**
 * Networks feature module.
 */
@Module({
    imports: [
        ProjectsModule,
        ServicesModule,
        TypeOrmModule.forFeature([DbProjectNetworkEntity, DbServiceNetworkEntity]),
    ],
    controllers: [NetworksController, ProjectNetworksController],
    providers: [
        NetworksService,
        ProjectNetworksService,
        DockerNetworksRepository,
        DatabaseProjectNetworksRepository,
        DatabaseServiceNetworksRepository,
    ],
    exports: [DatabaseProjectNetworksRepository, DatabaseServiceNetworksRepository],
})
export class NetworksModule {}
