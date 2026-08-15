import { GitRepository } from '../domain/models/git-repository.models';
import { ProviderCredentials } from '../domain/models/provider.models';
import { SourceControl } from '../domain/ports/source-control.port';

/**
 * Use case that lists the repositories accessible to the installation of a provider.
 *
 * @param sourceControl Source control port
 * @param credentials Credentials of the provider
 *
 * @returns Accessible repositories
 */
export function listRepositoriesUseCase(
    sourceControl: SourceControl,
    credentials: ProviderCredentials,
): Promise<GitRepository[]> {
    return sourceControl.listRepositories(credentials);
}
