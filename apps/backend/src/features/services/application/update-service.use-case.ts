import { UpdateServiceDto } from '../domain/dtos/update-service.dto';
import { Service } from '../domain/models/service.model';
import { ServicesRepository } from '../domain/repositories/services.repository';

/**
 * Use case for updating a service.
 *
 * @param repository Services repository
 * @param id Service id
 * @param updateDto Service data
 *
 * @returns Updated service, or `null` when it does not exist
 */
export function updateServiceUseCase(repository: ServicesRepository, id: string, updateDto: UpdateServiceDto): Promise<Service | null> {
    return repository.update(id, updateDto);
}
