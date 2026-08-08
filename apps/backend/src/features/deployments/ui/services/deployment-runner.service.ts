import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Subscription, concatMap, from, groupBy, mergeMap } from 'rxjs';

import { runDeploymentUseCase } from '../../application/run-deployment.use-case';
import type { QueuedDeploymentTask } from '../../domain/models/queued-deployment-task.models';
import type { DeploymentQueue } from '../../domain/ports/deployment-queue.port';
import type { DockerExecutor } from '../../domain/ports/docker-executor.port';
import type { DeploymentsRepository } from '../../domain/repositories/deployments.repository';
import { DatabaseDeploymentQueueAdapter } from '../../infrastructure/database/db-deployment-queue.adapter';
import { DatabaseDeploymentsRepository } from '../../infrastructure/database/db-deployments.repository';
import { DockerodeDockerExecutorAdapter } from '../../infrastructure/docker/dockerode-docker-executor.adapter';

import { DiagnosticLoggerService } from '@core/ui/services/diagnostic-logger.service';
import type { LogStore } from '@features/logs/domain/ports/log-store.port';
import { PersistentLogStoreRepository } from '@features/logs/infrastructure/log-store/log-store-persistent.repository';
import type { Providers } from '@features/providers/domain/ports/providers.port';
import { GithubProvidersAdapter } from '@features/providers/infrastructure/github/github-providers.adapter';

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
        @Inject(GithubProvidersAdapter)
        private readonly providersRepository: Providers,
        @Inject(DockerodeDockerExecutorAdapter)
        private readonly dockerExecutor: DockerExecutor,
        @Inject(PersistentLogStoreRepository)
        private readonly logStore: LogStore,
        @Inject(DatabaseDeploymentQueueAdapter)
        private readonly queue: DeploymentQueue,
        private readonly diagnostics: DiagnosticLoggerService,
    ) {}

    /**
     * Subscribes to deployment-run requests when the module starts.
     */
    public async onModuleInit(): Promise<void> {
        this.subscription = this.queue.dequeued$
            .pipe(
                groupBy((task) => task.projectName),
                mergeMap((group) => group.pipe(concatMap((task) => from(this.run(task))))),
            )
            .subscribe();

        await this.queue.recoverPending();
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
            await this.queue.markProcessing(task.id);

            await runDeploymentUseCase(
                this.deploymentsRepository,
                this.providersRepository,
                this.dockerExecutor,
                this.logStore,
                task,
            );

            await this.queue.markCompleted(task.id);
        } catch (error) {
            // Last-resort safety net: runDeploymentUseCase handles its own failures,
            // so this only guards a truly unexpected throw.
            const message = error instanceof Error ? error.message : String(error);

            this.diagnostics.error(
                `Deployment runner crashed for ${task.deploymentId}: ${message}`,
                error,
                DeploymentRunnerService.name,
            );

            await this.queue.markFailed(task.id, message);
        }
    }
}
