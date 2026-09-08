import { NamespaceNotEmptyError, NamespaceNotFoundError } from '../domain/errors/namespace.errors';
import { NamespacesRepository } from '../domain/repositories/namespaces.repository';

/**
 * Use case for deleting a namespace, refusing the deletion while the namespace
 * still holds projects.
 *
 * @param repository Namespaces repository
 * @param id Namespace id
 *
 * @throws NamespaceNotEmptyError When the namespace still has projects attached
 * @throws NamespaceNotFoundError When the namespace does not exist
 */
export async function deleteNamespaceUseCase(repository: NamespacesRepository, id: string): Promise<void> {
    const projectsCount = await repository.countProjects(id);

    if (projectsCount > 0) {
        throw new NamespaceNotEmptyError(id, projectsCount);
    }

    const deleted = await repository.delete(id);

    if (!deleted) {
        throw new NamespaceNotFoundError(id);
    }
}
