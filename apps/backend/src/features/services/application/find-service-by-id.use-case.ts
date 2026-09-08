import { ServiceNotFoundError } from '../domain/errors/service.errors';
import { Service } from '../domain/models/service.models';
import { ServicesRepository } from '../domain/repositories/services.repository';

/**
 * Use case for finding a service by its id.
 *
 * @param repository Services repository
 * @param id Service id
 *
 * @returns Service
 *
 * @throws ServiceNotFoundError When the service does not exist
 */
export async function findServiceByIdUseCase(repository: ServicesRepository, id: string): Promise<Service> {
    const service = await repository.findById(id);

    if (!service) {
        throw new ServiceNotFoundError(id);
    }

    return service;
}
