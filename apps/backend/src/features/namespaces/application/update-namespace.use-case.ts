import { UpdateNamespaceDto } from '../domain/dtos/update-namespace.dto';
import { Namespace } from '../domain/models/namespace.models';
import { NamespacesRepository } from '../domain/repositories/namespaces.repository';

/**
 * Use case for updating a namespace.
 *
 * @param repository Namespaces repository
 * @param id Namespace id
 * @param updateDto Namespace data
 *
 * @returns Updated namespace, or `null` when it does not exist
 */
export function updateNamespaceUseCase(
    repository: NamespacesRepository,
    id: string,
    updateDto: UpdateNamespaceDto,
): Promise<Namespace | null> {
    return repository.update(id, updateDto);
}
