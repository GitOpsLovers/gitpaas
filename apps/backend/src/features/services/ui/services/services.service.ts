import type { CreateServiceDto, UpdateServiceDto } from '@gitpaas/contracts';
import { Inject, Injectable } from '@nestjs/common';

import { createServiceUseCase } from '../../application/create-service.use-case';
import { deleteServiceUseCase } from '../../application/delete-service.use-case';
import { findServiceByIdUseCase } from '../../application/find-service-by-id.use-case';
import { getFinalComposeUseCase } from '../../application/get-final-compose.use-case';
import { getServicesByProjectUseCase } from '../../application/get-services-by-project.use-case';
import { refreshComposeEnvironmentUseCase } from '../../application/refresh-compose-environment.use-case';
import { updateServiceUseCase } from '../../application/update-service.use-case';
import { ComposeEnvironmentCache } from '../../domain/models/compose-environment.models';
import { FinalCompose } from '../../domain/models/final-compose.models';
import { Service } from '../../domain/models/service.models';
import type { RepositoryComposeFile } from '../../domain/ports/repository-compose-file.port';
import type { ServiceRuntimeResources } from '../../domain/ports/service-runtime-resources.port';
import type { ServicesRepository } from '../../domain/repositories/services.repository';
import { TarRepositoryComposeFileAdapter } from '../../infrastructure/archive/tar-repository-compose-file.adapter';
import { DatabaseServicesRepository } from '../../infrastructure/database/db-services.repository';
import { DockerServiceRuntimeResourcesAdapter } from '../../infrastructure/docker/docker-service-runtime-resources.adapter';
import { enrichWithService } from '../telemetry/enrich-with-service';

import type { AppLogger } from '@core/domain/ports/app-logger.port';
import { NestLoggerAdapter } from '@core/infrastructure/logging/nest-logger.adapter';
import type { DeploymentsRepository } from '@features/deployments/domain/repositories/deployments.repository';
import { DatabaseDeploymentsRepository } from '@features/deployments/infrastructure/database/db-deployments.repository';
import type { LogStore } from '@features/logs/domain/ports/log-store.port';
import { RedisLogStoreAdapter } from '@features/logs/infrastructure/redis/redis-log-store.adapter';
import type { NamespacesRepository } from '@features/namespaces/domain/repositories/namespaces.repository';
import { DatabaseNamespacesRepository } from '@features/namespaces/infrastructure/database/db-namespaces.repository';
import type { ProjectsRepository } from '@features/projects/domain/repositories/projects.repository';
import { DatabaseProjectsRepository } from '@features/projects/infrastructure/database/db-projects.repository';
import type { ProviderClient } from '@features/providers/domain/ports/provider-client.port';
import type { ProvidersRepository } from '@features/providers/domain/repositories/providers.repository';
import { DatabaseProvidersRepository } from '@features/providers/infrastructure/database/db-providers.repository';
import { GithubProviderClientAdapter } from '@features/providers/infrastructure/github/github-provider-client.adapter';

/**
 * Services service
 */
@Injectable()
export class ServicesService {
    constructor(
        @Inject(DatabaseServicesRepository)
        private readonly repository: ServicesRepository,
        @Inject(DatabaseDeploymentsRepository)
        private readonly deploymentsRepository: DeploymentsRepository,
        @Inject(DockerServiceRuntimeResourcesAdapter)
        private readonly serviceRuntimeResources: ServiceRuntimeResources,
        @Inject(RedisLogStoreAdapter)
        private readonly logStore: LogStore,
        @Inject(DatabaseProjectsRepository)
        private readonly projectsRepository: ProjectsRepository,
        @Inject(DatabaseNamespacesRepository)
        private readonly namespacesRepository: NamespacesRepository,
        @Inject(DatabaseProvidersRepository)
        private readonly providersRepository: ProvidersRepository,
        @Inject(GithubProviderClientAdapter)
        private readonly providerClient: ProviderClient,
        @Inject(TarRepositoryComposeFileAdapter)
        private readonly repositoryComposeFile: RepositoryComposeFile,
        @Inject(NestLoggerAdapter)
        private readonly logger: AppLogger,
    ) {}

    public getAllByProject(projectId: string): Promise<Service[]> {
        return getServicesByProjectUseCase(this.repository, projectId);
    }

    public async findById(id: string): Promise<Service> {
        const service = await findServiceByIdUseCase(this.repository, id);

        enrichWithService(service);

        return service;
    }

    public async create(createDto: CreateServiceDto): Promise<Service> {
        const service = await createServiceUseCase(
            this.repository,
            this.projectsRepository,
            this.namespacesRepository,
            createDto,
        );

        enrichWithService(service);

        return service;
    }

    /**
     * Change a service, and refresh the cache of its compose environment when the write names the path of the compose file
     *
     * @param id Service identifier
     * @param updateDto Data for updating the service
     *
     * @returns Updated service
     *
     * @throws {ServiceNotFoundError} When the service does not exist
     */
    public async update(id: string, updateDto: UpdateServiceDto): Promise<Service> {
        const service = await updateServiceUseCase(this.repository, id, updateDto);

        enrichWithService(service);

        if (updateDto.composerPath !== undefined) {
            // The cache is a convenience of the tab Environment, so a repository that answers no compose file never
            // fails the write of the service. The former cache stays until the next refresh.
            try {
                await this.refreshComposeEnvironment(id);
            } catch (error: unknown) {
                this.logger.warn(
                    `The refresh of the compose environment of the service ${id} failed: ${String(error)}`,
                    ServicesService.name,
                );
            }
        }

        return service;
    }

    /**
     * Read the compose file of the repository of a service, and cache the names and the values of its key `environment`
     *
     * @param id Service identifier
     *
     * @returns The cache that the refresh wrote, or `null` when it left the cache untouched
     *
     * @throws {ServiceNotFoundError} When the service does not exist
     * @throws {ProviderNotFoundError} When the provider of the service no longer exists
     */
    public refreshComposeEnvironment(id: string): Promise<ComposeEnvironmentCache | null> {
        return refreshComposeEnvironmentUseCase(
            this.repository,
            this.providersRepository,
            this.providerClient,
            this.repositoryComposeFile,
            id,
        );
    }

    /**
     * Answer the final Compose file of a service, and the origin of its text
     *
     * @param id Service identifier
     *
     * @returns The Compose text and its origin
     *
     * @throws {ServiceNotFoundError} When the service does not exist
     * @throws {ProviderNotFoundError} When the provider of the service no longer exists
     */
    public getFinalCompose(id: string): Promise<FinalCompose> {
        return getFinalComposeUseCase(
            this.repository,
            this.deploymentsRepository,
            this.providersRepository,
            this.providerClient,
            this.repositoryComposeFile,
            id,
        );
    }

    public delete(id: string): Promise<void> {
        return deleteServiceUseCase(
            this.repository,
            this.deploymentsRepository,
            this.serviceRuntimeResources,
            this.logStore,
            id,
        );
    }
}
