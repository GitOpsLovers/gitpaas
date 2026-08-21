import type { CreateNamespaceDto } from '@gitpaas/contracts';

import { Namespace } from '../domain/models/namespace.models';
import { NamespacesRepository } from '../domain/repositories/namespaces.repository';

/**
 * Use case for creating a new namespace
 *
 * @param repository Namespaces repository
 * @param createDto Namespace data
 *
 * @returns Created namespace
 */
export function createNamespaceUseCase(
    repository: NamespacesRepository,
    createDto: CreateNamespaceDto,
): Promise<Namespace> {
    return repository.create(createDto);
}
