import { CreateServiceDto } from '../domain/dtos/create-service.dto';
import { Service } from '../domain/models/service.model';
import { ServicesRepository } from '../domain/repositories/services.repository';

/**
 * Use case for creating a new service
 *
 * @param repository Services repository
 * @param createDto Service data
 *
 * @returns Created service
 */
export function createServiceUseCase(repository: ServicesRepository, createDto: CreateServiceDto): Promise<Service> {
    return repository.create(createDto);
}
