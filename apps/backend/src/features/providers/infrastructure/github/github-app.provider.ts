import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/rest';

import { GitBranch } from '../../domain/models/git-branch.model';
import { GitRepository } from '../../domain/models/git-repository.model';
import { GitProvider } from '../../domain/repositories/git-provider.repository';

@Injectable()

/**
 * GitHub App provider.
 */
export class GithubAppProvider implements GitProvider {
    private readonly logger = new Logger(GithubAppProvider.name);

    private client: Octokit | undefined;

    constructor(private readonly config: ConfigService) {}

    public async listRepositories(): Promise<GitRepository[]> {
        const repositories = await this.getClient().paginate('GET /installation/repositories');

        return repositories.map((repository) => ({
            id: repository.id,
            fullName: repository.full_name,
            defaultBranch: repository.default_branch,
            private: repository.private,
        }));
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

        return branches.map((branch) => ({ name: branch.name }));
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

        this.logger.log('Creating GitHub App installation client');

        return new Octokit({
            authStrategy: createAppAuth,
            auth: {
                appId,
                // The PEM is stored base64-encoded in the environment.
                privateKey: Buffer.from(privateKey, 'base64').toString('utf8'),
                installationId: Number(installationId),
            },
        });
    }
}
