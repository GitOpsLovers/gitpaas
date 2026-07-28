import { GitRepository } from '../domain/models/git-repository.models';
import { Providers } from '../domain/ports/providers.port';

/**
 * Use case that lists the repositories accessible to the installation.
 *
 * @param repository Providers repository
 *
 * @returns Accessible repositories
 */
export function listRepositoriesUseCase(repository: Providers): Promise<GitRepository[]> {
    return repository.listRepositories();
}
