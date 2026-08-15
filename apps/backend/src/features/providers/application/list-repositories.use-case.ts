import { GitRepository } from '../domain/models/git-repository.models';
import { ProviderCredentials } from '../domain/models/provider.models';
import { ProviderClient } from '../domain/ports/provider-client.port';

/**
 * Use case that lists the repositories accessible to the installation of a provider.
 *
 * @param providerClient Provider client port
 * @param credentials Credentials of the provider
 *
 * @returns Accessible repositories
 */
export function listRepositoriesUseCase(
    providerClient: ProviderClient,
    credentials: ProviderCredentials,
): Promise<GitRepository[]> {
    return providerClient.listRepositories(credentials);
}
