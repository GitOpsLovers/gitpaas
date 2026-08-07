import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DbDeploymentQueueTaskEntity } from './infrastructure/database/db-deployment-queue-task.entity';
import { DatabaseDeploymentQueueAdapter } from './infrastructure/database/db-deployment-queue.adapter';
import { DbDeploymentEntity } from './infrastructure/database/db-deployment.entity';
import { DatabaseDeploymentsRepository } from './infrastructure/database/db-deployments.repository';
import { DockerodeDockerExecutorAdapter } from './infrastructure/docker/dockerode-docker-executor.adapter';
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
        TypeOrmModule.forFeature([DbDeploymentEntity, DbDeploymentQueueTaskEntity]),
        forwardRef(() => ServicesModule),
        ProvidersModule,
        LogsModule,
    ],
    controllers: [DeploymentsController],
    providers: [
        DeploymentsService,
        DatabaseDeploymentsRepository,
        DatabaseDeploymentQueueAdapter,
        DockerodeDockerExecutorAdapter,
        DeploymentRunnerService,
    ],
    exports: [DatabaseDeploymentsRepository, DatabaseDeploymentQueueAdapter],
})
export class DeploymentsModule {}
