import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';

import { createDeploymentUseCase } from '../../application/create-deployment.use-case';
import { findDeploymentByIdUseCase } from '../../application/find-deployment-by-id.use-case';
import { getDeploymentsByServiceUseCase } from '../../application/get-deployments-by-service.use-case';
import { runDeploymentUseCase } from '../../application/run-deployment.use-case';
import { CreateDeploymentDto } from '../../domain/dtos/create-deployment.dto';
import { TriggerDeploymentDto } from '../../domain/dtos/trigger-deployment.dto';
import { Deployment } from '../../domain/models/deployment.model';
import { DeploymentsDatabaseRepository } from '../../infrastructure/database/deployments-db.repository';

import { DockerodeDockerExecutor } from '@core/docker/infrastructure/dockerode-docker.executor';
import { GithubAppProvider } from '@features/providers/infrastructure/github/github-app.provider';
import { Service } from '@features/services/domain/models/service.model';
import { ServicesDatabaseRepository } from '@features/services/infrastructure/database/services-db.repository';

@Injectable()

/**
 * Deployments service
 */
export class DeploymentsService {
    private readonly logger = new Logger(DeploymentsService.name);

    constructor(
        @Inject(DeploymentsDatabaseRepository)
        private readonly repository: DeploymentsDatabaseRepository,
        @Inject(ServicesDatabaseRepository)
        private readonly servicesRepository: ServicesDatabaseRepository,
        @Inject(GithubAppProvider)
        private readonly providersRepository: GithubAppProvider,
        @Inject(DockerodeDockerExecutor)
        private readonly dockerExecutor: DockerodeDockerExecutor,
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
     * Trigger a new deployment for a service
     *
     * @param triggerDto Data for triggering the deployment
     *
     * @returns The created deployment record
     */
    public async create(triggerDto: TriggerDeploymentDto): Promise<Deployment> {
        const service = await this.servicesRepository.findById(triggerDto.serviceId);

        if (!service) {
            throw new NotFoundException(`Service ${triggerDto.serviceId} not found`);
        }

        if (!service.repositoryId || !service.deploymentBranch) {
            throw new BadRequestException('Service has no repository or deployment branch configured');
        }

        const createDto: CreateDeploymentDto = {
            serviceId: service.id,
            branch: service.deploymentBranch,
            composerPath: service.composerPath,
            triggeredBy: 'system',
        };

        const deployment = await createDeploymentUseCase(this.repository, createDto);

        this.run(deployment, service);

        return deployment;
    }

    /**
     * Carries out the deployment in the background
     *
     * @param deployment Deployment record
     * @param service Service record
     */
    private run(deployment: Deployment, service: Service): void {
        runDeploymentUseCase(
            this.repository,
            this.providersRepository,
            this.dockerExecutor,
            {
                deploymentId: deployment.id,
                repositoryId: Number(service.repositoryId),
                branch: deployment.branch,
                composerPath: deployment.composerPath,
                projectName: this.projectName(service),
            },
        ).catch((error: unknown) => {
            this.logger.error(`Deployment ${deployment.id} runner crashed`, error instanceof Error ? error.stack : String(error));
        });
    }

    /**
     * Builds a compose project name from the service name, falling back to its id.
     */
    private projectName(service: Service): string {
        const slug = service.name.toLowerCase().replace(/[^\da-z]+/g, '-').replace(/^-+|-+$/g, '');

        return slug || `service-${service.id}`;
    }
}
