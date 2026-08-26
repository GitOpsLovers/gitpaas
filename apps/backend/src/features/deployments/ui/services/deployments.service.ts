import type { TriggerDeploymentDto } from '@gitpaas/contracts';
import { Inject, Injectable } from '@nestjs/common';

import { createDeploymentUseCase } from '../../application/create-deployment.use-case';
import { deleteDeploymentUseCase } from '../../application/delete-deployment.use-case';
import { findDeploymentByIdUseCase } from '../../application/find-deployment-by-id.use-case';
import { getComposeServicesUseCase } from '../../application/get-compose-services.use-case';
import { getDeploymentsByServiceUseCase } from '../../application/get-deployments-by-service.use-case';
import { Deployment } from '../../domain/models/deployment.models';
import type { DeploymentQueue } from '../../domain/ports/deployment-queue.port';
import type { DockerExecutor } from '../../domain/ports/docker-executor.port';
import type { DeploymentsRepository } from '../../domain/repositories/deployments.repository';
import { DatabaseDeploymentQueueAdapter } from '../../infrastructure/database/db-deployment-queue.adapter';
import { DatabaseDeploymentsRepository } from '../../infrastructure/database/db-deployments.repository';
import { DockerExecutorAdapter } from '../../infrastructure/docker/docker-executor.adapter';
import { enrichWithDeployment } from '../telemetry/enrich-with-deployment';

import type { LogStore } from '@features/logs/domain/ports/log-store.port';
import { RedisLogStoreAdapter } from '@features/logs/infrastructure/redis/redis-log-store.adapter';
import type { ProviderClient } from '@features/providers/domain/ports/provider-client.port';
import type { ProvidersRepository } from '@features/providers/domain/repositories/providers.repository';
import { DatabaseProvidersRepository } from '@features/providers/infrastructure/database/db-providers.repository';
import { GithubProviderClientAdapter } from '@features/providers/infrastructure/github/github-provider-client.adapter';
import type { ServicesRepository } from '@features/services/domain/repositories/services.repository';
import { DatabaseServicesRepository } from '@features/services/infrastructure/database/db-services.repository';

/**
 * Deployments service
 */
@Injectable()
export class DeploymentsService {
    constructor(
        @Inject(DatabaseDeploymentsRepository)
        private readonly repository: DeploymentsRepository,
        @Inject(DatabaseServicesRepository)
        private readonly servicesRepository: ServicesRepository,
        @Inject(DatabaseProvidersRepository)
        private readonly providersRepository: ProvidersRepository,
        @Inject(GithubProviderClientAdapter)
        private readonly providerClient: ProviderClient,
        @Inject(DatabaseDeploymentQueueAdapter)
        private readonly deploymentQueue: DeploymentQueue,
        @Inject(RedisLogStoreAdapter)
        private readonly logStore: LogStore,
        @Inject(DockerExecutorAdapter)
        private readonly dockerExecutor: DockerExecutor,
    ) {}

    /**
     * Get every deployment belonging to a service
     *
     * @param serviceId Service identifier
     *
     * @returns List of deployments for the service
     */
    public getAllByService(serviceId: string): Promise<Deployment[]> {
        return getDeploymentsByServiceUseCase(this.repository, serviceId);
    }

    /**
     * List the compose services the last deployment of a service declares
     *
     * @param serviceId Service identifier
     *
     * @returns The names of the compose services of the recipe, empty when the service was never deployed
     *
     * @throws {ServiceNotFoundError} When the service does not exist
     * @throws {ServiceNotDeployableError} When the service cannot be deployed
     * @throws {ProviderNotFoundError} When the provider of the service no longer exists
     */
    public getComposeServices(serviceId: string): Promise<string[]> {
        return getComposeServicesUseCase(
            this.repository,
            this.servicesRepository,
            this.providersRepository,
            this.providerClient,
            this.dockerExecutor,
            serviceId,
        );
    }

    /**
     * Find a single deployment by its identifier
     *
     * @param id Deployment identifier
     *
     * @returns Deployment record
     */
    public async findById(id: string): Promise<Deployment | null> {
        const deployment = await findDeploymentByIdUseCase(this.repository, id);

        if (deployment) {
            enrichWithDeployment(deployment);
        }

        return deployment;
    }

    /**
     * Delete a deployment record
     *
     * @param id Deployment identifier
     *
     * @returns `true` when a row was deleted, `false` otherwise
     */
    public delete(id: string): Promise<boolean> {
        return deleteDeploymentUseCase(this.repository, this.logStore, id);
    }

    /**
     * Trigger a new deployment for a service
     *
     * @param triggerDto Data for triggering the deployment
     *
     * @returns The created deployment record
     *
     * @throws {ServiceNotFoundError} When the service does not exist
     * @throws {ServiceNotDeployableError} When the service cannot be deployed
     * @throws {ProviderNotFoundError} When the provider of the service no longer exists
     * @throws {ProviderRepositoryUnreachableError} When the provider cannot reach the stored repository
     */
    public async create(triggerDto: TriggerDeploymentDto): Promise<Deployment> {
        const deployment = await createDeploymentUseCase(
            this.repository,
            this.servicesRepository,
            this.providersRepository,
            this.providerClient,
            this.deploymentQueue,
            triggerDto,
        );

        enrichWithDeployment(deployment);

        return deployment;
    }
}
