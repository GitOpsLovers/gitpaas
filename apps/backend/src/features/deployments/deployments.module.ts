import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DeploymentDbEntity } from './infrastructure/database/deployment-db.entity';
import { DeploymentsDatabaseRepository } from './infrastructure/database/deployments-db.repository';
import { DockerodeDockerExecutor } from './infrastructure/docker/dockerode-docker.executor';
import { RxjsDeploymentQueue } from './infrastructure/rxjs/rxjs-deployment.queue';
import { DeploymentsController } from './ui/controllers/deployments.controller';
import { DeploymentRunnerService } from './ui/services/deployment-runner.service';
import { DeploymentsService } from './ui/services/deployments.service';

import { LogsModule } from '@features/logs/logs.module';
import { ProvidersModule } from '@features/providers/providers.module';
import { ServicesModule } from '@features/services/services.module';

/**
 * Deployments feature module.
 *
 * Owns the deployment run: it builds and brings up a service's compose stack via
 * the docker executor, driven off the {@link DeploymentQueue} it owns and
 * exports, and streams the output to the logs write port. Imports `LogsModule`
 * to inject that port.
 */
@Module({
    imports: [TypeOrmModule.forFeature([DeploymentDbEntity]), ServicesModule, ProvidersModule, LogsModule],
    controllers: [DeploymentsController],
    providers: [
        DeploymentsService,
        DeploymentsDatabaseRepository,
        RxjsDeploymentQueue,
        DockerodeDockerExecutor,
        DeploymentRunnerService,
    ],
    exports: [DeploymentsDatabaseRepository, RxjsDeploymentQueue],
})
export class DeploymentsModule {}
