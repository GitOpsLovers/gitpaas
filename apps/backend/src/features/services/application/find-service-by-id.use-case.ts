import { Service } from '../domain/models/service.model';
import { ServicesRepository } from '../domain/repositories/services.repository';

/**
 * Use case for finding a service by its id.
 *
 * @param repository Services repository
 * @param id Service id
 *
 * @returns Service, or `null` when it does not exist
 */
export function findServiceByIdUseCase(repository: ServicesRepository, id: string): Promise<Service | null> {
    return repository.findById(id);
}
