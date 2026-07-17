import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Subscription, concatMap, from, groupBy, mergeMap } from 'rxjs';

import { runDeploymentUseCase } from '../../application/run-deployment.use-case';
import type { DockerExecutor } from '../../domain/executors/docker.executor';
import type { DeploymentRunTask } from '../../domain/models/deployment-run-task.model';
import type { DeploymentQueue } from '../../domain/queues/deployment.queue';
import type { DeploymentsRepository } from '../../domain/repositories/deployments.repository';
import { DeploymentsDatabaseRepository } from '../../infrastructure/database/deployments-db.repository';
import { DockerodeDockerExecutor } from '../../infrastructure/docker/dockerode-docker.executor';
import { RxjsDeploymentQueue } from '../../infrastructure/rxjs/rxjs-deployment.queue';

import { DiagnosticLoggerService } from '@core/ui/services/diagnostic-logger.service';
import type { LogStoreRepository } from '@features/logs/domain/repositories/log-store.repository';
import { PersistentLogStoreRepository } from '@features/logs/infrastructure/log-store/persistent-log-store.repository';
import type { ProvidersRepository } from '@features/providers/domain/repositories/providers.repository';
import { GithubAppProvider } from '@features/providers/infrastructure/github/github-app.provider';

/**
 * Deployment runner.
 *
 * Subscribes to the deployment queue (which the deployments feature owns) and
 * on each requested run drives {@link runDeploymentUseCase}, which owns the
 * docker run and streams the output to the logs write port.
 */
@Injectable()
export class DeploymentRunnerService implements OnModuleInit, OnModuleDestroy {
    private subscription?: Subscription;

    constructor(
        @Inject(DeploymentsDatabaseRepository)
        private readonly deploymentsRepository: DeploymentsRepository,
        @Inject(GithubAppProvider)
        private readonly providersRepository: ProvidersRepository,
        @Inject(DockerodeDockerExecutor)
        private readonly dockerExecutor: DockerExecutor,
        @Inject(PersistentLogStoreRepository)
        private readonly logStore: LogStoreRepository,
        @Inject(RxjsDeploymentQueue)
        private readonly queue: DeploymentQueue,
        private readonly diagnostics: DiagnosticLoggerService,
    ) {}

    /**
     * Subscribes to deployment-run requests when the module starts.
     *
     * Runs are serialized per compose project name so two overlapping
     * deployments of the same service never race on the same project (their
     * `down()`/`up()` cycles cannot interleave). Tasks are grouped by
     * `task.projectName` and each group is drained with `concatMap`, which
     * waits for the current run to complete before starting the next. Distinct
     * projects live in separate groups and are merged concurrently, preserving
     * cross-service parallelism. `run` swallows its own errors, so a failed run
     * can never terminate its group's stream.
     */
    public onModuleInit(): void {
        this.subscription = this.queue.dequeued$
            .pipe(
                groupBy((task) => task.projectName),
                mergeMap((group) => group.pipe(concatMap((task) => from(this.run(task))))),
            )
            .subscribe();
    }

    /**
     * Tears down the bus subscription when the module is destroyed.
     */
    public onModuleDestroy(): void {
        this.subscription?.unsubscribe();
    }

    /**
     * Runs a single deployment, guarding against unexpected throws.
     *
     * @param task Deployment run task
     */
    private async run(task: DeploymentRunTask): Promise<void> {
        try {
            await runDeploymentUseCase(
                this.deploymentsRepository,
                this.providersRepository,
                this.dockerExecutor,
                this.logStore,
                task,
            );
        } catch (error) {
            // Last-resort safety net: runDeploymentUseCase handles its own failures,
            // so this only guards a truly unexpected throw.
            const message = error instanceof Error ? error.message : String(error);

            this.diagnostics.error(
                `Deployment runner crashed for ${task.deploymentId}: ${message}`,
                error,
                DeploymentRunnerService.name,
            );
        }
    }
}
