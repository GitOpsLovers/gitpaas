import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DatabaseDeploymentQueue } from './infrastructure/database/database-deployment.queue';
import { DeploymentDbEntity } from './infrastructure/database/deployment-db.entity';
import { DeploymentQueueTaskDbEntity } from './infrastructure/database/deployment-queue-task-db.entity';
import { DeploymentsDatabaseRepository } from './infrastructure/database/deployments-db.repository';
import { DockerodeDockerExecutor } from './infrastructure/docker/dockerode-docker.executor';
import { DeploymentsController } from './ui/controllers/deployments.controller';
import { DeploymentRunnerService } from './ui/services/deployment-runner.service';
import { DeploymentsService } from './ui/services/deployments.service';

import { LogsModule } from '@features/logs/logs.module';
import { ProvidersModule } from '@features/providers/providers.module';
import { ServicesModule } from '@features/services/services.module';

/**
 * Deployments feature module.
 */
@Module({
    imports: [
        TypeOrmModule.forFeature([DeploymentDbEntity, DeploymentQueueTaskDbEntity]),
        forwardRef(() => ServicesModule),
        ProvidersModule,
        LogsModule,
    ],
    controllers: [DeploymentsController],
    providers: [
        DeploymentsService,
        DeploymentsDatabaseRepository,
        DatabaseDeploymentQueue,
        DockerodeDockerExecutor,
        DeploymentRunnerService,
    ],
    exports: [DeploymentsDatabaseRepository, DatabaseDeploymentQueue],
})
export class DeploymentsModule {}
