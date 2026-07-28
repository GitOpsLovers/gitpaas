import { GitBranch } from '../domain/models/git-branch.models';
import { Providers } from '../domain/ports/providers.port';

/**
 * Use case that lists the branches of a repository.
 *
 * @param repository Providers repository
 * @param repositoryId Repository identifier
 *
 * @returns Branches of the repository
 */
export function listBranchesUseCase(repository: Providers, repositoryId: number): Promise<GitBranch[]> {
    return repository.listBranches(repositoryId);
}
