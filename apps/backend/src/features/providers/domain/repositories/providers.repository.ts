import { GitBranch } from '../models/git-branch.model';
import { GitCommit } from '../models/git-commit.model';
import { GitRepository } from '../models/git-repository.model';

/**
 * Providers repository
 */
export interface ProvidersRepository {
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

    /**
     * Resolve a ref (branch, tag or commit) to its head commit
     *
     * @param repositoryId Repository identifier
     * @param ref Branch, tag or commit to resolve
     *
     * @returns The resolved commit, with its SHA and message
     */
    getCommit: (repositoryId: number, ref: string) => Promise<GitCommit>;

    /**
     * Read the UTF-8 content of a file in a repository at a given ref
     *
     * @param repositoryId Repository identifier
     * @param path Path to the file within the repository
     * @param ref Branch, tag or commit to read the file from
     *
     * @returns The file content
     */
    getFileContent: (repositoryId: number, path: string, ref: string) => Promise<string>;

    /**
     * Download a repository's source as a gzipped tarball at a given ref
     *
     * @param repositoryId Repository identifier
     * @param ref Branch, tag or commit to download
     *
     * @returns The gzipped tarball bytes
     */
    getRepositoryArchive: (repositoryId: number, ref: string) => Promise<Buffer>;
}
