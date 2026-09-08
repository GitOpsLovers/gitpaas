import type { UpdateNamespaceDto } from '@gitpaas/contracts';

import { NamespaceNotFoundError } from '../domain/errors/namespace.errors';
import { Namespace } from '../domain/models/namespace.models';
import { NamespacesRepository } from '../domain/repositories/namespaces.repository';

/**
 * Use case for updating a namespace.
 *
 * @param repository Namespaces repository
 * @param id Namespace id
 * @param updateDto Namespace data
 *
 * @returns Updated namespace
 *
 * @throws NamespaceNotFoundError When the namespace does not exist
 */
export async function updateNamespaceUseCase(
    repository: NamespacesRepository,
    id: string,
    updateDto: UpdateNamespaceDto,
): Promise<Namespace> {
    const namespace = await repository.update(id, updateDto);

    if (!namespace) {
        throw new NamespaceNotFoundError(id);
    }

    return namespace;
}
