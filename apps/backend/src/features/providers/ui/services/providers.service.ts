import { Inject, Injectable } from '@nestjs/common';

import { listBranchesUseCase } from '../../application/list-branches.use-case';
import { listRepositoriesUseCase } from '../../application/list-repositories.use-case';
import { GitBranch } from '../../domain/models/git-branch.model';
import { GitRepository } from '../../domain/models/git-repository.model';
import { GithubAppProvider } from '../../infrastructure/github/github-app.provider';

@Injectable()

/**
 * Providers service
 */
export class ProvidersService {
    constructor(
        @Inject(GithubAppProvider)
        private readonly provider: GithubAppProvider,
    ) {}

    /**
     * Lists the repositories accessible to the installation.
     *
     * @returns Accessible repositories
     */
    public listRepositories(): Promise<GitRepository[]> {
        return listRepositoriesUseCase(this.provider);
    }

    /**
     * Lists the branches of a repository.
     *
     * @param repositoryId Repository identifier
     *
     * @returns Accessible branches
     */
    public listBranches(repositoryId: number): Promise<GitBranch[]> {
        return listBranchesUseCase(this.provider, repositoryId);
    }
}
