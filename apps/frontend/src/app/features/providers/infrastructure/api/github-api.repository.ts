import { httpResource } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { GitBranch } from '../../domain/models/git-branch.model';
import { GitRepository } from '../../domain/models/git-repository.model';

@Injectable()

/**
 * GitHub provider API repository
 */
export class GithubApiRepository {
    private readonly url = 'http://localhost:3000/api/v1/github';

    /**
     * Resource with the repositories accessible to the installation
     */
    public readonly repositories = httpResource<GitRepository[]>(() => `${this.url}/repositories`);

    /**
     * Resource with the branches of a repository
     *
     * @param repositoryId Accessor returning the repository identifier
     *
     * @returns Resource that resolves to the repository branches
     */
    public branchesByRepository(repositoryId: () => number | undefined) {
        return httpResource<GitBranch[]>(() => {
            const id = repositoryId();

            return id ? `${this.url}/repositories/${id}/branches` : undefined;
        });
    }
}
