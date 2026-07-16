import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/rest';

import { GitBranch } from '../../domain/models/git-branch.model';
import { GitCommit } from '../../domain/models/git-commit.model';
import { GitRepository } from '../../domain/models/git-repository.model';
import { ProvidersRepository } from '../../domain/repositories/providers.repository';

import { toGitBranch, toGitCommit, toGitRepository } from './github-app.transformer';

import { DiagnosticLoggerService } from '@core/ui/services/diagnostic-logger.service';

/**
 * GitHub App provider.
 */
@Injectable()
export class GithubAppProvider implements ProvidersRepository {
    private client: Octokit | undefined;

    constructor(
        private readonly config: ConfigService,
        private readonly diagnostics: DiagnosticLoggerService,
    ) {}

    public async listRepositories(): Promise<GitRepository[]> {
        const repositories = await this.getClient().paginate('GET /installation/repositories');

        return repositories.map(toGitRepository);
    }

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
     */
    private getClient(): Octokit {
        this.client ??= this.createClient();

        return this.client;
    }

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

        this.diagnostics.log('Creating GitHub App installation client', GithubAppProvider.name);

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
