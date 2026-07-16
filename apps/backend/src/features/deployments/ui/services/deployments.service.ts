import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';

import { createDeploymentUseCase } from '../../application/create-deployment.use-case';
import { deleteDeploymentUseCase } from '../../application/delete-deployment.use-case';
import { findDeploymentByIdUseCase } from '../../application/find-deployment-by-id.use-case';
import { getDeploymentsByServiceUseCase } from '../../application/get-deployments-by-service.use-case';
import { TriggerDeploymentDto } from '../../domain/dtos/trigger-deployment.dto';
import { ServiceNotDeployableError, ServiceNotFoundError } from '../../domain/errors/deployment.errors';
import { Deployment } from '../../domain/models/deployment.model';
import { DeploymentsDatabaseRepository } from '../../infrastructure/database/deployments-db.repository';
import { RxjsDeploymentQueue } from '../../infrastructure/rxjs/rxjs-deployment.queue';

import type { LogStoreRepository } from '@features/logs/domain/repositories/log-store.repository';
import { PersistentLogStoreRepository } from '@features/logs/infrastructure/log-store/persistent-log-store.repository';
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
        @Inject(RxjsDeploymentQueue)
        private readonly queue: RxjsDeploymentQueue,
        @Inject(PersistentLogStoreRepository)
        private readonly logStore: LogStoreRepository,
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
