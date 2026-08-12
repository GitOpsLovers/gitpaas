import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/rest';

import { SourceControlNotConfiguredError } from '../../domain/errors/source-control.errors';
import { GitBranch } from '../../domain/models/git-branch.models';
import { GitCommit } from '../../domain/models/git-commit.models';
import { GitRepository } from '../../domain/models/git-repository.models';
import { SourceControl } from '../../domain/ports/source-control.port';

import {
    toGitBranch, toGitCommit, toGitRepository, toSourceControlError,
} from './github-source-control.transformer';

import type { AppLogger } from '@core/domain/ports/app-logger.port';
import { NestLoggerAdapter } from '@core/infrastructure/logging/nest-logger.adapter';

/**
 * GitHub source control adapter.
 *
 * Every GitHub call goes through `run`, which translates an Octokit failure into
 * the domain error that describes it (see
 * `github-source-control.transformer.ts`). The raw Octokit error never escapes
 * this class, so the UI edge can answer 404/503 instead of a blanket 500 and no
 * GitHub payload reaches the client.
 */
@Injectable()
export class GithubSourceControlAdapter implements SourceControl {
    private client: Octokit | undefined;

    constructor(
        private readonly config: ConfigService,
        @Inject(NestLoggerAdapter) private readonly logger: AppLogger,
    ) {}

    public listRepositories(): Promise<GitRepository[]> {
        return this.run(async () => {
            const repositories = await this.getClient().paginate('GET /installation/repositories');

            return repositories.map(toGitRepository);
        });
    }

    public listBranches(repositoryId: number): Promise<GitBranch[]> {
        return this.run(async () => {
            const { data: repository } = await this.getClient().request('GET /repositories/{id}', {
                id: repositoryId,
            });

            const [owner, repo] = repository.full_name.split('/');

            const branches = await this.getClient().paginate('GET /repos/{owner}/{repo}/branches', {
                owner,
                repo,
            });

            return branches.map(toGitBranch);
        });
    }

    public getCommit(repositoryId: number, ref: string): Promise<GitCommit> {
        return this.run(async () => {
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
        });
    }

    public getRepositoryArchive(repositoryId: number, ref: string): Promise<Buffer> {
        return this.run(async () => {
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
        });
    }

    /**
     * Runs a GitHub operation, translating any failure it raises into the domain
     * error that describes it.
     *
     * @param operation GitHub call to run
     *
     * @returns Whatever the operation resolves to
     *
     * @throws A `SourceControl*Error` describing the failure, or the original
     * error when it cannot be classified
     */
    private async run<T>(operation: () => Promise<T>): Promise<T> {
        try {
            return await operation();
        } catch (error) {
            throw toSourceControlError(error);
        }
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
            throw new SourceControlNotConfiguredError();
        }

        this.logger.log('Creating GitHub App installation client', GithubSourceControlAdapter.name);

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
