import { GitBranch } from '../models/git-branch.models';
import { GitCommit } from '../models/git-commit.models';
import { GitRepository } from '../models/git-repository.models';

import { ProviderCredentials } from '@features/providers/domain/models/provider.models';

/**
 * Source control port
 */
export interface SourceControl {
    /**
     * List repositories
     *
     * @param credentials Credentials of the provider
     *
     * @returns A list of repositories
     */
    listRepositories: (credentials: ProviderCredentials) => Promise<GitRepository[]>;

    /**
     * List the branches of a repository
     *
     * @param credentials Credentials of the provider
     * @param repositoryId Repository identifier
     *
     * @returns A list of branches
     */
    listBranches: (credentials: ProviderCredentials, repositoryId: number) => Promise<GitBranch[]>;

    /**
     * Resolve a ref (branch, tag or commit) to its head commit
     *
     * @param credentials Credentials of the provider
     * @param repositoryId Repository identifier
     * @param ref Branch, tag or commit to resolve
     *
     * @returns The resolved commit, with its SHA and message
     */
    getCommit: (credentials: ProviderCredentials, repositoryId: number, ref: string) => Promise<GitCommit>;

    /**
     * Download a repository's source as a gzipped tarball at a given ref
     *
     * @param credentials Credentials of the provider
     * @param repositoryId Repository identifier
     * @param ref Branch, tag or commit to download
     *
     * @returns The gzipped tarball bytes
     */
    getRepositoryArchive: (credentials: ProviderCredentials, repositoryId: number, ref: string) => Promise<Buffer>;

    /**
     * Verify that the source control accepts the credentials of a provider
     *
     * @param credentials Credentials of the provider
     *
     * @returns Whether the source control accepts the credentials
     */
    verifyCredentials: (credentials: ProviderCredentials) => Promise<boolean>;
}
