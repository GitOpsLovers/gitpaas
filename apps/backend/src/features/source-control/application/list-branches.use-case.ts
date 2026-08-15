import { GitBranch } from '../domain/models/git-branch.models';
import { SourceControl } from '../domain/ports/source-control.port';

import { ProviderCredentials } from '@features/providers/domain/models/provider.models';

/**
 * Use case that lists the branches of a repository.
 *
 * @param sourceControl Source control port
 * @param credentials Credentials of the provider
 * @param repositoryId Repository identifier
 *
 * @returns Branches of the repository
 */
export function listBranchesUseCase(
    sourceControl: SourceControl,
    credentials: ProviderCredentials,
    repositoryId: number,
): Promise<GitBranch[]> {
    return sourceControl.listBranches(credentials, repositoryId);
}
