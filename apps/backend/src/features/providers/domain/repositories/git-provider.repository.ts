import { GitBranch } from '../models/git-branch.model';
import { GitRepository } from '../models/git-repository.model';

/**
 * Port to a source-control provider (GitHub).
 */
export interface GitProvider {
    /**
     * List every repository the installation can access
     *
     * @returns A list of repositories
     */
    listRepositories: () => Promise<GitRepository[]>;

    /**
     * List the branches of a repository
     *
     * @param repositoryId Repository identifier
     *
     * @returns A list of branches
     */
    listBranches: (repositoryId: number) => Promise<GitBranch[]>;
}
