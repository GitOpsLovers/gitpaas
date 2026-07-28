import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DeploymentQueueDatabaseAdapter } from './infrastructure/database/deployment-queue-db.adapter';
import { DeploymentDbEntity } from './infrastructure/database/deployment-db.entity';
import { DeploymentQueueTaskDbEntity } from './infrastructure/database/deployment-queue-task-db.entity';
import { DeploymentsDatabaseRepository } from './infrastructure/database/deployments-db.repository';
import { DockerExecutorDockerodeAdapter } from './infrastructure/docker/docker-executor-dockerode.adapter';
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
        DeploymentQueueDatabaseAdapter,
        DockerExecutorDockerodeAdapter,
        DeploymentRunnerService,
    ],
    exports: [DeploymentsDatabaseRepository, DeploymentQueueDatabaseAdapter],
})
export class DeploymentsModule {}
