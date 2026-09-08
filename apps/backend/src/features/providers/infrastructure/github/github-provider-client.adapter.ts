import { Injectable } from '@nestjs/common';
import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/rest';

import {
    ProviderAuthenticationError,
    ProviderNotConfiguredError,
} from '../../domain/errors/provider-client.errors';
import { GitBranch } from '../../domain/models/git-branch.models';
import { GitCommit } from '../../domain/models/git-commit.models';
import { GitRepository } from '../../domain/models/git-repository.models';
import { ProviderRegistrationConversion } from '../../domain/models/provider-registration.models';
import { ProviderCredentials, ProviderCredentialsVerification } from '../../domain/models/provider.models';
import { ProviderClient } from '../../domain/ports/provider-client.port';

import {
    toGitBranch,
    toGitCommit,
    toGitRepository,
    toManifestConversionError,
    toProviderAppPermissions,
    toProviderClientError,
    toProviderRegistrationConversion,
} from './github-provider-client.transformer';

import { recordDependencyCall } from '@core/infrastructure/telemetry/telemetry-deps';
import { enrichTelemetry } from '@core/infrastructure/telemetry/telemetry.context';

/**
 * An Octokit client of a provider, kept with the credentials that authenticated it.
 */
interface CachedProviderClient {
    credentials: ProviderCredentials;
    client: Octokit;
}

/**
 * Tells whether two sets of credentials of a provider authenticate the same installation with the same key.
 *
 * @param one Credentials the cache holds
 * @param other Credentials of the call
 *
 * @returns `true` when every field of the authentication matches
 */
function holdsSameCredentials(one: ProviderCredentials, other: ProviderCredentials): boolean {
    return one.appId === other.appId
        && one.installationId === other.installationId
        && one.privateKey === other.privateKey;
}

/**
 * GitHub provider client adapter.
 */
@Injectable()
export class GithubProviderClientAdapter implements ProviderClient {
    private readonly clients = new Map<string, CachedProviderClient>();

    private anonymousClient?: Octokit;

    public listRepositories(credentials: ProviderCredentials): Promise<GitRepository[]> {
        return this.run(async () => {
            const repositories = await this.getClient(credentials).paginate('GET /installation/repositories');

            return repositories.map(toGitRepository);
        });
    }

    public listBranches(credentials: ProviderCredentials, repositoryId: number): Promise<GitBranch[]> {
        enrichTelemetry({ 'deps.github.repository_id': repositoryId });

        return this.run(async () => {
            const client = this.getClient(credentials);

            const { data: repository } = await client.request('GET /repositories/{id}', {
                id: repositoryId,
            });

            const [owner, repo] = repository.full_name.split('/');

            const branches = await client.paginate('GET /repos/{owner}/{repo}/branches', {
                owner,
                repo,
            });

            return branches.map(toGitBranch);
        });
    }

    public getCommit(credentials: ProviderCredentials, repositoryId: number, ref: string): Promise<GitCommit> {
        enrichTelemetry({ 'deps.github.repository_id': repositoryId, 'deps.github.ref': ref });

        return this.run(async () => {
            const client = this.getClient(credentials);

            const { data: repository } = await client.request('GET /repositories/{id}', {
                id: repositoryId,
            });

            const [owner, repo] = repository.full_name.split('/');

            const { data: commit } = await client.request('GET /repos/{owner}/{repo}/commits/{ref}', {
                owner,
                repo,
                ref,
            });

            return toGitCommit(commit);
        });
    }

    public getRepositoryArchive(credentials: ProviderCredentials, repositoryId: number, ref: string): Promise<Buffer> {
        enrichTelemetry({ 'deps.github.repository_id': repositoryId, 'deps.github.ref': ref });

        return this.run(async () => {
            const client = this.getClient(credentials);

            const { data: repository } = await client.request('GET /repositories/{id}', {
                id: repositoryId,
            });

            const [owner, repo] = repository.full_name.split('/');

            // Octokit follows GitHub's 302 to codeload and returns the tarball bytes as an ArrayBuffer.
            const { data } = await client.request('GET /repos/{owner}/{repo}/tarball/{ref}', {
                owner,
                repo,
                ref,
            });

            const archive = Buffer.from(data as ArrayBuffer);

            enrichTelemetry({ 'deps.github.archive_bytes': archive.byteLength });

            return archive;
        });
    }

    public async verifyCredentials(credentials: ProviderCredentials): Promise<ProviderCredentialsVerification> {
        try {
            return await this.run(async () => {
                const { data: app } = await this.getClient(credentials).request('GET /app');

                return { accepted: true, permissions: toProviderAppPermissions(app?.permissions) };
            });
        } catch (error) {
            if (error instanceof ProviderAuthenticationError || error instanceof ProviderNotConfiguredError) {
                return { accepted: false, permissions: {} };
            }

            throw error;
        }
    }

    public async convertAppManifest(code: string): Promise<ProviderRegistrationConversion> {
        try {
            return await this.run(async () => {
                const { data: application } = await this.getAnonymousClient().request(
                    'POST /app-manifests/{code}/conversions',
                    { code },
                );

                return toProviderRegistrationConversion(application);
            });
        } catch (error) {
            throw toManifestConversionError(error);
        }
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

            throw toProviderClientError(error);
        }
    }

    /**
     * Lazily-created, reused Octokit client authenticated as the installation of one provider.
     *
     * @param credentials Credentials of the provider
     *
     * @returns Octokit client authenticated as the GitHub App installation of the provider
     */
    private getClient(credentials: ProviderCredentials): Octokit {
        const cached = this.clients.get(credentials.providerId);

        if (cached && holdsSameCredentials(cached.credentials, credentials)) {
            return cached.client;
        }

        const client = this.createClient(credentials);

        this.clients.set(credentials.providerId, { credentials, client });

        return client;
    }

    /**
     * Lazily-created, reused Octokit client that carries no authentication.
     *
     * @returns Octokit client with no authentication
     */
    private getAnonymousClient(): Octokit {
        this.anonymousClient ??= new Octokit();

        return this.anonymousClient;
    }

    /**
     * Builds an Octokit client authenticated as the GitHub App installation of a provider.
     *
     * @param credentials Credentials of the provider
     *
     * @returns Freshly created Octokit client
     *
     * @throws ProviderNotConfiguredError When the provider holds no usable credentials
     */
    private createClient(credentials: ProviderCredentials): Octokit {
        const { providerId, appId, privateKey, installationId } = credentials;

        if (!appId || !privateKey || !installationId) {
            throw new ProviderNotConfiguredError(providerId);
        }

        return new Octokit({
            authStrategy: createAppAuth,
            auth: {
                appId,
                privateKey,
                installationId: Number(installationId),
            },
        });
    }
}
