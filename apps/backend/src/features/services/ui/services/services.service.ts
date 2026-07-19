import { Inject, Injectable } from '@nestjs/common';

import { createServiceUseCase } from '../../application/create-service.use-case';
import { deleteServiceUseCase } from '../../application/delete-service.use-case';
import { findServiceByIdUseCase } from '../../application/find-service-by-id.use-case';
import { getServicesByProjectUseCase } from '../../application/get-services-by-project.use-case';
import { updateServiceUseCase } from '../../application/update-service.use-case';
import { CreateServiceDto } from '../../domain/dtos/create-service.dto';
import { UpdateServiceDto } from '../../domain/dtos/update-service.dto';
import { Service } from '../../domain/models/service.model';
import type { ServiceFootprintRepository } from '../../domain/repositories/service-footprint.repository';
import { ServicesDatabaseRepository } from '../../infrastructure/database/services-db.repository';
import { DockerServiceFootprintRepository } from '../../infrastructure/docker/docker-service-footprint.repository';

import type { DeploymentsRepository } from '@features/deployments/domain/repositories/deployments.repository';
import { DeploymentsDatabaseRepository } from '@features/deployments/infrastructure/database/deployments-db.repository';
import type { LogStoreRepository } from '@features/logs/domain/repositories/log-store.repository';
import { PersistentLogStoreRepository } from '@features/logs/infrastructure/log-store/persistent-log-store.repository';

/**
 * Services service
 */
@Injectable()
export class ServicesService {
    constructor(
        @Inject(ServicesDatabaseRepository)
        private readonly repository: ServicesDatabaseRepository,
        @Inject(DeploymentsDatabaseRepository)
        private readonly deploymentsRepository: DeploymentsRepository,
        @Inject(DockerServiceFootprintRepository)
        private readonly serviceFootprint: ServiceFootprintRepository,
        @Inject(PersistentLogStoreRepository)
        private readonly logStore: LogStoreRepository,
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
            this.serviceFootprint,
            this.logStore,
            id,
        );
    }
}
