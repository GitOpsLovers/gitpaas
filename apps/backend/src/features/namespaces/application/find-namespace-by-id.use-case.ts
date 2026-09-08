import { NamespaceNotFoundError } from '../domain/errors/namespace.errors';
import { Namespace } from '../domain/models/namespace.models';
import { NamespacesRepository } from '../domain/repositories/namespaces.repository';

/**
 * Use case for finding a namespace by its id.
 *
 * @param repository Namespaces repository
 * @param id Namespace id
 *
 * @returns Namespace
 *
 * @throws NamespaceNotFoundError When the namespace does not exist
 */
export async function findNamespaceByIdUseCase(repository: NamespacesRepository, id: string): Promise<Namespace> {
    const namespace = await repository.findById(id);

    if (!namespace) {
        throw new NamespaceNotFoundError(id);
    }

    return namespace;
}
