import { GitRepository } from '../domain/models/git-repository.model';
import { GitProvider } from '../domain/repositories/git-provider.repository';

/**
 * Use case that lists the repositories accessible to the installation.
 *
 * @param provider Source-control provider
 *
 * @returns Accessible repositories
 */
export function listRepositoriesUseCase(provider: GitProvider): Promise<GitRepository[]> {
    return provider.listRepositories();
}
