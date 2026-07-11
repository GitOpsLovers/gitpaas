import { GitRepository } from '../domain/models/git-repository.model';
import { ProvidersRepository } from '../domain/repositories/providers.repository';

/**
 * Use case that lists the repositories accessible to the installation.
 *
 * @param repository Providers repository
 *
 * @returns Accessible repositories
 */
export function listRepositoriesUseCase(repository: ProvidersRepository): Promise<GitRepository[]> {
    return repository.listRepositories();
}
