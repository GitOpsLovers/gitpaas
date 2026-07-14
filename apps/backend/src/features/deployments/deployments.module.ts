import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DeploymentDbEntity } from './infrastructure/database/deployment-db.entity';
import { DeploymentsDatabaseRepository } from './infrastructure/database/deployments-db.repository';
import { DockerodeDockerExecutor } from './infrastructure/docker/dockerode-docker.executor';
import { DeploymentsController } from './ui/controllers/deployments.controller';
import { DeploymentsService } from './ui/services/deployments.service';

import { LogsModule } from '@features/logs/logs.module';
import { ProvidersModule } from '@features/providers/providers.module';
import { ServicesModule } from '@features/services/services.module';

/**
 * Deployments feature module.
 */
@Module({
    imports: [TypeOrmModule.forFeature([DeploymentDbEntity]), ServicesModule, ProvidersModule, LogsModule],
    controllers: [DeploymentsController],
    providers: [
        DeploymentsService,
        DeploymentsDatabaseRepository,
        DockerodeDockerExecutor,
    ],
})
export class DeploymentsModule {}
