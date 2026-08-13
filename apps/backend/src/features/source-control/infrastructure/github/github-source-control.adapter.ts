import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/rest';

import { SourceControlNotConfiguredError } from '../../domain/errors/source-control.errors';
import { GitBranch } from '../../domain/models/git-branch.models';
import { GitCommit } from '../../domain/models/git-commit.models';
import { GitRepository } from '../../domain/models/git-repository.models';
import { SourceControl } from '../../domain/ports/source-control.port';

import { toGitBranch, toGitCommit, toGitRepository, toSourceControlError } from './github-source-control.transformer';

import { recordDependencyCall } from '@core/infrastructure/telemetry/telemetry-deps';
import { enrichTelemetry } from '@core/infrastructure/telemetry/telemetry.context';

/**
 * GitHub source control adapter.
 */
@Injectable()
export class GithubSourceControlAdapter implements SourceControl {
    private client: Octokit | undefined;

    constructor(private readonly config: ConfigService) {}

    public listRepositories(): Promise<GitRepository[]> {
        return this.run(async () => {
            const repositories = await this.getClient().paginate('GET /installation/repositories');

            return repositories.map(toGitRepository);
        });
    }

    public listBranches(repositoryId: number): Promise<GitBranch[]> {
        enrichTelemetry({ 'deps.github.repository_id': repositoryId });

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
        enrichTelemetry({ 'deps.github.repository_id': repositoryId, 'deps.github.ref': ref });

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
        enrichTelemetry({ 'deps.github.repository_id': repositoryId, 'deps.github.ref': ref });

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

            const archive = Buffer.from(data as ArrayBuffer);

            enrichTelemetry({ 'deps.github.archive_bytes': archive.byteLength });

            return archive;
        });
    }

    /**
     * Runs a GitHub operation, counting it on the telemetry.
     *
     * @param operation GitHub call to run
     *
     * @returns Whatever the operation resolves to
     */
    private async run<T>(operation: () => Promise<T>): Promise<T> {
        const startedAt = performance.now();

        try {
            const result = await operation();

            recordDependencyCall('github', performance.now() - startedAt, false);

            return result;
        } catch (error) {
            recordDependencyCall('github', performance.now() - startedAt, true);

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
     * Builds an Octokit client authenticated as the GitHub App installation from the configured credentials.
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
