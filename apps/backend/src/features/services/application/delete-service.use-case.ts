import { ServicesRepository } from '../domain/repositories/services.repository';

/**
 * Use case for deleting a service
 *
 * @param repository Services repository
 * @param id Service id
 *
 * @returns `true` when a row was deleted, `false` otherwise
 */
export function deleteServiceUseCase(repository: ServicesRepository, id: string): Promise<boolean> {
    return repository.delete(id);
}
