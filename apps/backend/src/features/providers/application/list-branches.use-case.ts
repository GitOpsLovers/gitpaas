import { GitBranch } from '../domain/models/git-branch.model';
import { GitProvider } from '../domain/repositories/git-provider.repository';

/**
 * Use case that lists the branches of a repository.
 *
 * @param provider Source-control provider
 * @param repositoryId Repository identifier
 *
 * @returns Branches of the repository
 */
export function listBranchesUseCase(provider: GitProvider, repositoryId: number): Promise<GitBranch[]> {
    return provider.listBranches(repositoryId);
}
