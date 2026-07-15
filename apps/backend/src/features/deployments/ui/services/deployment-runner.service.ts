import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Subscription } from 'rxjs';

import { runDeploymentUseCase } from '../../application/run-deployment.use-case';
import { DeploymentsDatabaseRepository } from '../../infrastructure/database/deployments-db.repository';
import { DockerodeDockerExecutor } from '../../infrastructure/docker/dockerode-docker.executor';
import { DeploymentRunBus, DeploymentRunRequest } from '../../infrastructure/events/deployment-run.bus';

import { DiagnosticLoggerService } from '@core/ui/services/diagnostic-logger.service';
import { PersistentLogStoreRepository } from '@features/logs/infrastructure/log-store/persistent-log-store.repository';
import { GithubAppProvider } from '@features/providers/infrastructure/github/github-app.provider';

/**
 * Deployment runner.
 *
 * Subscribes to the deployment-run bus (which the deployments feature owns) and
 * on each requested run drives {@link runDeploymentUseCase}, which owns the
 * docker run and streams the output to the logs write port.
 */
@Injectable()
export class DeploymentRunnerService implements OnModuleInit, OnModuleDestroy {
    private subscription?: Subscription;

    constructor(
        @Inject(DeploymentsDatabaseRepository)
        private readonly deploymentsRepository: DeploymentsDatabaseRepository,
        @Inject(GithubAppProvider)
        private readonly providersRepository: GithubAppProvider,
        @Inject(DockerodeDockerExecutor)
        private readonly dockerExecutor: DockerodeDockerExecutor,
        @Inject(PersistentLogStoreRepository)
        private readonly logStore: PersistentLogStoreRepository,
        private readonly runBus: DeploymentRunBus,
        private readonly diagnostics: DiagnosticLoggerService,
    ) {}

    /**
     * Subscribes to deployment-run requests when the module starts.
     */
    public onModuleInit(): void {
        this.subscription = this.runBus.requests$.subscribe((request) => {
            this.run(request);
        });
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
     * @param request Deployment-run request
     */
    private async run(request: DeploymentRunRequest): Promise<void> {
        try {
            await runDeploymentUseCase(
                this.deploymentsRepository,
                this.providersRepository,
                this.dockerExecutor,
                this.logStore,
                request,
            );
        } catch (error) {
            // Last-resort safety net: runDeploymentUseCase handles its own failures,
            // so this only guards a truly unexpected throw.
            const message = error instanceof Error ? error.message : String(error);

            this.diagnostics.error(
                `Deployment runner crashed for ${request.deploymentId}: ${message}`,
                error,
                DeploymentRunnerService.name,
            );
        }
    }
}
