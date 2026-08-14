import { Namespace } from '../domain/models/namespace.models';
import { NamespacesRepository } from '../domain/repositories/namespaces.repository';

/**
 * Use case for finding a namespace by its id.
 *
 * @param repository Namespaces repository
 * @param id Namespace id
 *
 * @returns Namespace, or `null` when it does not exist
 */
export function findNamespaceByIdUseCase(repository: NamespacesRepository, id: string): Promise<Namespace | null> {
    return repository.findById(id);
}
