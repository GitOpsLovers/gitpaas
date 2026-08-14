import { Namespace } from '../domain/models/namespace.models';
import { NamespacesRepository } from '../domain/repositories/namespaces.repository';

/**
 * Use case for retrieving all namespaces.
 *
 * @param repository Namespaces repository
 *
 * @returns All namespaces
 */
export function getAllNamespacesUseCase(repository: NamespacesRepository): Promise<Namespace[]> {
    return repository.getAll();
}
