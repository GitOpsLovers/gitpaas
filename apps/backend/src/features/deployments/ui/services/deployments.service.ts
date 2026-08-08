import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';

import { createDeploymentUseCase } from '../../application/create-deployment.use-case';
import { deleteDeploymentUseCase } from '../../application/delete-deployment.use-case';
import { findDeploymentByIdUseCase } from '../../application/find-deployment-by-id.use-case';
import { getDeploymentsByServiceUseCase } from '../../application/get-deployments-by-service.use-case';
import { TriggerDeploymentDto } from '../../domain/dtos/trigger-deployment.dto';
import { ServiceNotDeployableError, ServiceNotFoundError } from '../../domain/errors/deployment.errors';
import { Deployment } from '../../domain/models/deployment.models';
import type { DeploymentQueue } from '../../domain/ports/deployment-queue.port';
import type { DeploymentsRepository } from '../../domain/repositories/deployments.repository';
import { DatabaseDeploymentQueueAdapter } from '../../infrastructure/database/db-deployment-queue.adapter';
import { DatabaseDeploymentsRepository } from '../../infrastructure/database/db-deployments.repository';

import type { LogStore } from '@features/logs/domain/ports/log-store.port';
import { DatabaseLogStoreAdapter } from '@features/logs/infrastructure/database/db-log-store.adapter';
import type { Providers } from '@features/providers/domain/ports/providers.port';
import { GithubProvidersAdapter } from '@features/providers/infrastructure/github/github-providers.adapter';
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
        @Inject(GithubProvidersAdapter)
        private readonly providersRepository: Providers,
        @Inject(DatabaseDeploymentQueueAdapter)
        private readonly queue: DeploymentQueue,
        @Inject(DatabaseLogStoreAdapter)
        private readonly logStore: LogStore,
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
     * Find a single deployment by its identifier
     *
     * @param id Deployment identifier
     *
     * @returns Deployment record
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
        return deleteDeploymentUseCase(this.repository, this.logStore, id);
    }

    /**
     * Trigger a new deployment for a service
     *
     * @param triggerDto Data for triggering the deployment
     *
     * @returns The created deployment record
     */
    public async create(triggerDto: TriggerDeploymentDto): Promise<Deployment> {
        try {
            return await createDeploymentUseCase(
                this.repository,
                this.servicesRepository,
                this.providersRepository,
                this.queue,
                triggerDto,
            );
        } catch (error) {
            if (error instanceof ServiceNotFoundError) {
                throw new NotFoundException(error.message);
            }

            if (error instanceof ServiceNotDeployableError) {
                throw new BadRequestException(error.message);
            }

            throw error;
        }
    }
}
