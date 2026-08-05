import { Inject, Injectable } from '@nestjs/common';

import { listBranchesUseCase } from '../../application/list-branches.use-case';
import { listRepositoriesUseCase } from '../../application/list-repositories.use-case';
import { GitBranch } from '../../domain/models/git-branch.models';
import { GitRepository } from '../../domain/models/git-repository.models';
import type { Providers } from '../../domain/ports/providers.port';
import { GithubProvidersAdapter } from '../../infrastructure/github/github-providers.adapter';

/**
 * Providers service
 */
@Injectable()
export class ProvidersService {
    constructor(
        @Inject(GithubProvidersAdapter)
        private readonly provider: Providers,
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
