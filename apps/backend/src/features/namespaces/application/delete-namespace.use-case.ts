import { NamespaceNotEmptyError } from '../domain/errors/namespace.errors';
import { NamespacesRepository } from '../domain/repositories/namespaces.repository';

/**
 * Use case for deleting a namespace, refusing the deletion while the namespace
 * still holds projects.
 *
 * @param repository Namespaces repository
 * @param id Namespace id
 *
 * @returns `true` when a row was deleted, `false` otherwise
 *
 * @throws NamespaceNotEmptyError When the namespace still has projects attached
 */
export async function deleteNamespaceUseCase(repository: NamespacesRepository, id: string): Promise<boolean> {
    const projectsCount = await repository.countProjects(id);

    if (projectsCount > 0) {
        throw new NamespaceNotEmptyError(id, projectsCount);
    }

    return repository.delete(id);
}
