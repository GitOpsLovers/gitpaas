import { GitRepository } from '../domain/models/git-repository.models';
import { SourceControl } from '../domain/ports/source-control.port';

/**
 * Use case that lists the repositories accessible to the installation.
 *
 * @param sourceControl Source control port
 *
 * @returns Accessible repositories
 */
export function listRepositoriesUseCase(sourceControl: SourceControl): Promise<GitRepository[]> {
    return sourceControl.listRepositories();
}
