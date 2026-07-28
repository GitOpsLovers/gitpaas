import { Inject, Injectable } from '@nestjs/common';

import { listBranchesUseCase } from '../../application/list-branches.use-case';
import { listRepositoriesUseCase } from '../../application/list-repositories.use-case';
import { GitBranch } from '../../domain/models/git-branch.models';
import { GitRepository } from '../../domain/models/git-repository.models';
import { ProvidersGithubAdapter } from '../../infrastructure/github/providers-github.adapter';

/**
 * Providers service
 */
@Injectable()
export class ProvidersService {
    constructor(
        @Inject(ProvidersGithubAdapter)
        private readonly provider: ProvidersGithubAdapter,
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
