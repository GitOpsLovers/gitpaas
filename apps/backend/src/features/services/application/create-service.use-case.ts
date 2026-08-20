import type { CreateServiceDto } from '@gitpaas/contracts';

import { Service } from '../domain/models/service.models';
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
