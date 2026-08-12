import { GitBranch } from '../domain/models/git-branch.models';
import { SourceControl } from '../domain/ports/source-control.port';

/**
 * Use case that lists the branches of a repository.
 *
 * @param sourceControl Source control port
 * @param repositoryId Repository identifier
 *
 * @returns Branches of the repository
 */
export function listBranchesUseCase(sourceControl: SourceControl, repositoryId: number): Promise<GitBranch[]> {
    return sourceControl.listBranches(repositoryId);
}
