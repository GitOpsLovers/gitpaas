import { Inject, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';

import { createDeploymentUseCase } from '../../application/create-deployment.use-case';
import { deleteDeploymentUseCase } from '../../application/delete-deployment.use-case';
import { findDeploymentByIdUseCase } from '../../application/find-deployment-by-id.use-case';
import { getDeploymentsByServiceUseCase } from '../../application/get-deployments-by-service.use-case';
import { TriggerDeploymentDto } from '../../domain/dtos/trigger-deployment.dto';
import { Deployment } from '../../domain/models/deployment.model';
import { DeploymentsDatabaseRepository } from '../../infrastructure/database/deployments-db.repository';
import { DockerodeDockerExecutor } from '../../infrastructure/docker/dockerode-docker.executor';

import { LogEvent } from '@features/logs/domain/models/log-event.model';
import { RedisLogStoreRepository } from '@features/logs/infrastructure/redis/redis-log-store.repository';
import { GithubAppProvider } from '@features/providers/infrastructure/github/github-app.provider';
import { ServicesDatabaseRepository } from '@features/services/infrastructure/database/services-db.repository';

/**
 * Deployments service
 */
@Injectable()
export class DeploymentsService {
    constructor(
        @Inject(DeploymentsDatabaseRepository)
        private readonly repository: DeploymentsDatabaseRepository,
        @Inject(ServicesDatabaseRepository)
        private readonly servicesRepository: ServicesDatabaseRepository,
        @Inject(GithubAppProvider)
        private readonly providersRepository: GithubAppProvider,
        @Inject(DockerodeDockerExecutor)
        private readonly dockerExecutor: DockerodeDockerExecutor,
        @Inject(RedisLogStoreRepository)
        private readonly logStoreRepository: RedisLogStoreRepository,
    ) {}

    /**
     * Get every deployment belonging to a service, most recent first
     *
     * @param serviceId Service identifier
     *
     * @returns List of deployments for the service
     */
    public getAllByService(serviceId: string): Promise<Deployment[]> {
        return getDeploymentsByServiceUseCase(this.repository, serviceId);
    }

    /**
     * Find a single deployment by its identifier
     *
     * @param id Deployment identifier
     *
     * @returns Deployment record, or `null` if not found
     */
    public findById(id: string): Promise<Deployment | null> {
        return findDeploymentByIdUseCase(this.repository, id);
    }

    /**
     * Delete a deployment record
     *
     * @param id Deployment identifier
     *
     * @returns `true` when a row was deleted, `false` otherwise
     */
    public delete(id: string): Promise<boolean> {
        return deleteDeploymentUseCase(this.repository, id);
    }

    /**
     * Trigger a new deployment for a service
     *
     * @param triggerDto Data for triggering the deployment
     *
     * @returns The created deployment record
     */
    public create(triggerDto: TriggerDeploymentDto): Promise<Deployment> {
        return createDeploymentUseCase(
            this.repository,
            this.servicesRepository,
            this.providersRepository,
            this.dockerExecutor,
            this.logStoreRepository,
            triggerDto,
        );
    }

    /**
     * Streams a deployment's log: buffered lines first, then live output.
     *
     * @param id Deployment identifier
     *
     * @returns Observable of log events for the deployment
     */
    public streamLogs(id: string): Observable<LogEvent> {
        return this.logStoreRepository.stream(id);
    }
}
