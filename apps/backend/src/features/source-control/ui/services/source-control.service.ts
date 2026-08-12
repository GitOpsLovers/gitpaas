import { Inject, Injectable } from '@nestjs/common';

import { listBranchesUseCase } from '../../application/list-branches.use-case';
import { listRepositoriesUseCase } from '../../application/list-repositories.use-case';
import { GitBranch } from '../../domain/models/git-branch.models';
import { GitRepository } from '../../domain/models/git-repository.models';
import type { SourceControl } from '../../domain/ports/source-control.port';
import { GithubSourceControlAdapter } from '../../infrastructure/github/github-source-control.adapter';

/**
 * Source control service
 */
@Injectable()
export class SourceControlService {
    constructor(
        @Inject(GithubSourceControlAdapter)
        private readonly sourceControl: SourceControl,
    ) {}

    /**
     * Lists the repositories accessible to the installation.
     *
     * @returns Accessible repositories
     */
    public listRepositories(): Promise<GitRepository[]> {
        return listRepositoriesUseCase(this.sourceControl);
    }

    /**
     * Lists the branches of a repository.
     *
     * @param repositoryId Repository identifier
     *
     * @returns Accessible branches
     */
    public listBranches(repositoryId: number): Promise<GitBranch[]> {
        return listBranchesUseCase(this.sourceControl, repositoryId);
    }
}
