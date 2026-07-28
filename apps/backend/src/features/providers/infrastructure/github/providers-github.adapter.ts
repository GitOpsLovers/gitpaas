import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/rest';

import { GitBranch } from '../../domain/models/git-branch.models';
import { GitCommit } from '../../domain/models/git-commit.models';
import { GitRepository } from '../../domain/models/git-repository.models';
import { Providers } from '../../domain/ports/providers.port';

import { toGitBranch, toGitCommit, toGitRepository } from './github-app.transformer';

import { DiagnosticLoggerService } from '@core/ui/services/diagnostic-logger.service';

/**
 * GitHub App provider.
 */
@Injectable()
export class ProvidersGithubAdapter implements Providers {
    private client: Octokit | undefined;

    constructor(
        private readonly config: ConfigService,
        private readonly diagnostics: DiagnosticLoggerService,
    ) {}

    /**
     * List every repository the installation can access
     *
     * @returns A list of repositories
     */
    public async listRepositories(): Promise<GitRepository[]> {
        const repositories = await this.getClient().paginate('GET /installation/repositories');

        return repositories.map(toGitRepository);
    }

    /**
     * List the branches of a repository
     *
     * @param repositoryId Repository identifier
     *
     * @returns A list of branches
     */
    public async listBranches(repositoryId: number): Promise<GitBranch[]> {
        const { data: repository } = await this.getClient().request('GET /repositories/{id}', {
            id: repositoryId,
        });

        const [owner, repo] = repository.full_name.split('/');

        const branches = await this.getClient().paginate('GET /repos/{owner}/{repo}/branches', {
            owner,
            repo,
        });

        return branches.map(toGitBranch);
    }

    /**
     * Resolve a ref (branch, tag or commit) to its head commit
     *
     * @param repositoryId Repository identifier
     * @param ref Branch, tag or commit to resolve
     *
     * @returns The resolved commit, with its SHA and message
     */
    public async getCommit(repositoryId: number, ref: string): Promise<GitCommit> {
        const { data: repository } = await this.getClient().request('GET /repositories/{id}', {
            id: repositoryId,
        });

        const [owner, repo] = repository.full_name.split('/');

        const { data: commit } = await this.getClient().request('GET /repos/{owner}/{repo}/commits/{ref}', {
            owner,
            repo,
            ref,
        });

        return toGitCommit(commit);
    }

    /**
     * Read the UTF-8 content of a file in a repository at a given ref
     *
     * @param repositoryId Repository identifier
     * @param path Path to the file within the repository
     * @param ref Branch, tag or commit to read the file from
     *
     * @returns The file content
     */
    public async getFileContent(repositoryId: number, path: string, ref: string): Promise<string> {
        const { data: repository } = await this.getClient().request('GET /repositories/{id}', {
            id: repositoryId,
        });

        const [owner, repo] = repository.full_name.split('/');

        // `{+path}` (reserved expansion) keeps the slashes in nested paths; a plain `{path}`
        // would percent-encode `/` to `%2F` and GitHub would 404 on the literal name.
        const { data } = await this.getClient().request('GET /repos/{owner}/{repo}/contents/{+path}', {
            owner,
            repo,
            path,
            ref,
        });

        if (Array.isArray(data) || data.type !== 'file' || typeof data.content !== 'string') {
            throw new NotFoundException(`"${path}" is not a file in ${repository.full_name}@${ref}`);
        }

        return Buffer.from(data.content, 'base64').toString('utf8');
    }

    /**
     * Download a repository's source as a gzipped tarball at a given ref
     *
     * @param repositoryId Repository identifier
     * @param ref Branch, tag or commit to download
     *
     * @returns The gzipped tarball bytes
     */
    public async getRepositoryArchive(repositoryId: number, ref: string): Promise<Buffer> {
        const { data: repository } = await this.getClient().request('GET /repositories/{id}', {
            id: repositoryId,
        });

        const [owner, repo] = repository.full_name.split('/');

        // Octokit follows GitHub's 302 to codeload and returns the tarball bytes as an ArrayBuffer.
        const { data } = await this.getClient().request('GET /repos/{owner}/{repo}/tarball/{ref}', {
            owner,
            repo,
            ref,
        });

        return Buffer.from(data as ArrayBuffer);
    }

    /**
     * Lazily-created, reused Octokit client authenticated as the installation.
     *
     * @returns Octokit client authenticated as the GitHub App installation
     */
    private getClient(): Octokit {
        this.client ??= this.createClient();

        return this.client;
    }

    /**
     * Builds an Octokit client authenticated as the GitHub App installation from
     * the configured credentials.
     *
     * @returns Freshly created Octokit client
     */
    private createClient(): Octokit {
        const appId = this.config.get<string>('GITHUB_APP_ID');
        const privateKey = this.config.get<string>('GITHUB_APP_PRIVATE_KEY');
        const installationId = this.config.get<string>('GITHUB_APP_INSTALLATION_ID');

        if (!appId || !privateKey || !installationId) {
            throw new ServiceUnavailableException(
                'GitHub App is not configured. Set GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY and '
                    + 'GITHUB_APP_INSTALLATION_ID in the backend environment.',
            );
        }

        this.diagnostics.log('Creating GitHub App installation client', ProvidersGithubAdapter.name);

        return new Octokit({
            authStrategy: createAppAuth,
            auth: {
                appId,
                privateKey: Buffer.from(privateKey, 'base64').toString('utf8'),
                installationId: Number(installationId),
            },
        });
    }
}
