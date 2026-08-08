import { Inject, Injectable } from '@nestjs/common';

import { createServiceUseCase } from '../../application/create-service.use-case';
import { deleteServiceUseCase } from '../../application/delete-service.use-case';
import { findServiceByIdUseCase } from '../../application/find-service-by-id.use-case';
import { getServicesByProjectUseCase } from '../../application/get-services-by-project.use-case';
import { updateServiceUseCase } from '../../application/update-service.use-case';
import { CreateServiceDto } from '../../domain/dtos/create-service.dto';
import { UpdateServiceDto } from '../../domain/dtos/update-service.dto';
import { Service } from '../../domain/models/service.models';
import type { ServiceRuntimeResources } from '../../domain/ports/service-runtime-resources.port';
import type { ServicesRepository } from '../../domain/repositories/services.repository';
import { DatabaseServicesRepository } from '../../infrastructure/database/db-services.repository';
import { DockerServiceRuntimeResourcesAdapter } from '../../infrastructure/docker/docker-service-runtime-resources.adapter';

import type { DeploymentsRepository } from '@features/deployments/domain/repositories/deployments.repository';
import { DatabaseDeploymentsRepository } from '@features/deployments/infrastructure/database/db-deployments.repository';
import type { LogStore } from '@features/logs/domain/ports/log-store.port';
import { DatabaseLogStoreAdapter } from '@features/logs/infrastructure/database/db-log-store.adapter';

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
        @Inject(DatabaseLogStoreAdapter)
        private readonly logStore: LogStore,
    ) {}

    public getAllByProject(projectId: string): Promise<Service[]> {
        return getServicesByProjectUseCase(this.repository, projectId);
    }

    public findById(id: string): Promise<Service | null> {
        return findServiceByIdUseCase(this.repository, id);
    }

    public create(createDto: CreateServiceDto): Promise<Service> {
        return createServiceUseCase(this.repository, createDto);
    }

    public update(id: string, updateDto: UpdateServiceDto): Promise<Service | null> {
        return updateServiceUseCase(this.repository, id, updateDto);
    }

    public delete(id: string): Promise<boolean> {
        return deleteServiceUseCase(
            this.repository,
            this.deploymentsRepository,
            this.serviceRuntimeResources,
            this.logStore,
            id,
        );
    }
}
