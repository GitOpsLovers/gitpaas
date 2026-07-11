import { GitBranch } from '../domain/models/git-branch.model';
import { ProvidersRepository } from '../domain/repositories/providers.repository';

/**
 * Use case that lists the branches of a repository.
 *
 * @param repository Providers repository
 * @param repositoryId Repository identifier
 *
 * @returns Branches of the repository
 */
export function listBranchesUseCase(repository: ProvidersRepository, repositoryId: number): Promise<GitBranch[]> {
    return repository.listBranches(repositoryId);
}
