import type { UpdateServiceDto } from '@gitpaas/contracts';

import { ServiceNotFoundError } from '../domain/errors/service.errors';
import { Service } from '../domain/models/service.models';
import { ServicesRepository } from '../domain/repositories/services.repository';

/**
 * Use case for updating a service.
 *
 * @param repository Services repository
 * @param id Service id
 * @param updateDto Service data
 *
 * @returns Updated service
 *
 * @throws ServiceNotFoundError When the service does not exist
 */
export async function updateServiceUseCase(repository: ServicesRepository, id: string, updateDto: UpdateServiceDto): Promise<Service> {
    const service = await repository.update(id, updateDto);

    if (!service) {
        throw new ServiceNotFoundError(id);
    }

    return service;
}
