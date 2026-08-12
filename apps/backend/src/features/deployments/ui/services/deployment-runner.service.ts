import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Subscription, concatMap, from, groupBy, mergeMap } from 'rxjs';

import { runDeploymentUseCase } from '../../application/run-deployment.use-case';
import type { QueuedDeploymentTask } from '../../domain/models/queued-deployment-task.models';
import type { DeploymentQueue } from '../../domain/ports/deployment-queue.port';
import type { DockerExecutor } from '../../domain/ports/docker-executor.port';
import type { DeploymentsRepository } from '../../domain/repositories/deployments.repository';
import { DatabaseDeploymentQueueAdapter } from '../../infrastructure/database/db-deployment-queue.adapter';
import { DatabaseDeploymentsRepository } from '../../infrastructure/database/db-deployments.repository';
import { DockerExecutorAdapter } from '../../infrastructure/docker/docker-executor.adapter';

import type { AppLogger } from '@core/domain/ports/app-logger.port';
import { NestLoggerAdapter } from '@core/infrastructure/logging/nest-logger.adapter';
import type { LogStore } from '@features/logs/domain/ports/log-store.port';
import { RedisLogStoreAdapter } from '@features/logs/infrastructure/redis/redis-log-store.adapter';
import type { SourceControl } from '@features/source-control/domain/ports/source-control.port';
import { GithubSourceControlAdapter } from '@features/source-control/infrastructure/github/github-source-control.adapter';

/**
 * Deployment runner.
 *
 * Subscribes to the deployment queue and on each requested run triggers the use case
 */
@Injectable()
export class DeploymentRunnerService implements OnModuleInit, OnModuleDestroy {
    private subscription?: Subscription;

    constructor(
        @Inject(DatabaseDeploymentsRepository)
        private readonly deploymentsRepository: DeploymentsRepository,
        @Inject(GithubSourceControlAdapter)
        private readonly sourceControl: SourceControl,
        @Inject(DockerExecutorAdapter)
        private readonly dockerExecutor: DockerExecutor,
        @Inject(RedisLogStoreAdapter)
        private readonly logStore: LogStore,
        @Inject(DatabaseDeploymentQueueAdapter)
        private readonly deploymentQueue: DeploymentQueue,
        @Inject(NestLoggerAdapter)
        private readonly logger: AppLogger,
    ) {}

    /**
     * Subscribes to deployment-run requests when the module starts.
     */
    public async onModuleInit(): Promise<void> {
        this.subscription = this.deploymentQueue.dequeued$
            .pipe(
                groupBy((task) => task.projectName),
                mergeMap((group) => group.pipe(concatMap((task) => from(this.run(task))))),
            )
            .subscribe();

        await this.deploymentQueue.recoverPending();
    }

    /**
     * Tears down the bus subscription when the module is destroyed.
     */
    public onModuleDestroy(): void {
        this.subscription?.unsubscribe();
    }

    /**
     * Runs a single deployment.
     *
     * @param task Queued deployment task
     */
    private async run(task: QueuedDeploymentTask): Promise<void> {
        try {
            await this.deploymentQueue.markProcessing(task.id);

            await runDeploymentUseCase(
                this.deploymentsRepository,
                this.sourceControl,
                this.dockerExecutor,
                this.logStore,
                task,
            );

            await this.deploymentQueue.markCompleted(task.id);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);

            this.logger.error(
                `Deployment runner crashed for ${task.deploymentId}: ${message}`,
                error,
                DeploymentRunnerService.name,
            );

            await this.deploymentQueue.markFailed(task.id, message);
        }
    }
}
