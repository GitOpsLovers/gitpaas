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
import { enrichWithService } from '../telemetry/enrich-with-service';

import type { DeploymentsRepository } from '@features/deployments/domain/repositories/deployments.repository';
import { DatabaseDeploymentsRepository } from '@features/deployments/infrastructure/database/db-deployments.repository';
import type { LogStore } from '@features/logs/domain/ports/log-store.port';
import { RedisLogStoreAdapter } from '@features/logs/infrastructure/redis/redis-log-store.adapter';

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
    ) {}

    public getAllByProject(projectId: string): Promise<Service[]> {
        return getServicesByProjectUseCase(this.repository, projectId);
    }

    public async findById(id: string): Promise<Service | null> {
        const service = await findServiceByIdUseCase(this.repository, id);

        if (service) {
            enrichWithService(service);
        }

        return service;
    }

    public async create(createDto: CreateServiceDto): Promise<Service> {
        const service = await createServiceUseCase(this.repository, createDto);

        enrichWithService(service);

        return service;
    }

    public async update(id: string, updateDto: UpdateServiceDto): Promise<Service | null> {
        const service = await updateServiceUseCase(this.repository, id, updateDto);

        if (service) {
            enrichWithService(service);
        }

        return service;
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
