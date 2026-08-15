import { GitBranch } from '../domain/models/git-branch.models';
import { ProviderCredentials } from '../domain/models/provider.models';
import { ProviderClient } from '../domain/ports/provider-client.port';

/**
 * Use case that lists the branches of a repository.
 *
 * @param providerClient Provider client port
 * @param credentials Credentials of the provider
 * @param repositoryId Repository identifier
 *
 * @returns Branches of the repository
 */
export function listBranchesUseCase(
    providerClient: ProviderClient,
    credentials: ProviderCredentials,
    repositoryId: number,
): Promise<GitBranch[]> {
    return providerClient.listBranches(credentials, repositoryId);
}
