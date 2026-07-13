import { Inject, Injectable } from '@nestjs/common';

import { createServiceUseCase } from '../../application/create-service.use-case';
import { deleteServiceUseCase } from '../../application/delete-service.use-case';
import { findServiceByIdUseCase } from '../../application/find-service-by-id.use-case';
import { getServicesByProjectUseCase } from '../../application/get-services-by-project.use-case';
import { updateServiceUseCase } from '../../application/update-service.use-case';
import { CreateServiceDto } from '../../domain/dtos/create-service.dto';
import { UpdateServiceDto } from '../../domain/dtos/update-service.dto';
import { Service } from '../../domain/models/service.model';
import { ServicesDatabaseRepository } from '../../infrastructure/database/services-db.repository';

/**
 * Services service
 */
@Injectable()
export class ServicesService {
    constructor(
        @Inject(ServicesDatabaseRepository)
        private readonly repository: ServicesDatabaseRepository,
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
        return deleteServiceUseCase(this.repository, id);
    }
}
