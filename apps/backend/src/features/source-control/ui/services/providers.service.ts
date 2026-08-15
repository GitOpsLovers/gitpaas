import { Inject, Injectable } from '@nestjs/common';

import { createProviderUseCase } from '../../application/create-provider.use-case';
import { deleteProviderUseCase } from '../../application/delete-provider.use-case';
import { findProviderByIdUseCase } from '../../application/find-provider-by-id.use-case';
import { getAllProvidersUseCase } from '../../application/get-all-providers.use-case';
import { getProviderCredentialsUseCase } from '../../application/get-provider-credentials.use-case';
import { listBranchesUseCase } from '../../application/list-branches.use-case';
import { listRepositoriesUseCase } from '../../application/list-repositories.use-case';
import { updateProviderUseCase } from '../../application/update-provider.use-case';
import { CreateProviderDto } from '../../domain/dtos/create-provider.dto';
import { UpdateProviderDto } from '../../domain/dtos/update-provider.dto';
import { GitBranch } from '../../domain/models/git-branch.models';
import { GitRepository } from '../../domain/models/git-repository.models';
import { Provider, ProviderConnectionTest } from '../../domain/models/provider.models';
import type { SourceControl } from '../../domain/ports/source-control.port';
import type { ProvidersRepository } from '../../domain/repositories/providers.repository';
import { DatabaseProvidersRepository } from '../../infrastructure/database/db-providers.repository';
import { GithubSourceControlAdapter } from '../../infrastructure/github/github-source-control.adapter';

import type { SecretCipher } from '@core/domain/ports/secret-cipher.port';
import { SecretCipherAdapter } from '@core/infrastructure/crypto/secret-cipher.adapter';
import { enrichTelemetry } from '@core/infrastructure/telemetry/telemetry.context';

/**
 * Providers service
 */
@Injectable()
export class ProvidersService {
    constructor(
        @Inject(DatabaseProvidersRepository)
        private readonly repository: ProvidersRepository,
        @Inject(SecretCipherAdapter)
        private readonly cipher: SecretCipher,
        @Inject(GithubSourceControlAdapter)
        private readonly sourceControl: SourceControl,
    ) {}

    /**
     * Gets all providers
     *
     * @returns All providers
     */
    public getAll(): Promise<Provider[]> {
        return getAllProvidersUseCase(this.repository);
    }

    /**
     * Gets a single provider by id
     *
     * @param id Provider id
     *
     * @returns Provider, or `null` when it does not exist
     */
    public findById(id: string): Promise<Provider | null> {
        return findProviderByIdUseCase(this.repository, id);
    }

    /**
     * Registers a provider, sealing its private key at rest
     *
     * @param createDto Provider data
     *
     * @returns Created provider
     */
    public async create(createDto: CreateProviderDto): Promise<Provider> {
        const provider = await createProviderUseCase(this.repository, this.cipher, createDto);

        enrichTelemetry({ 'provider.id': provider.id });

        return provider;
    }

    /**
     * Changes a provider, keeping the stored key when the new key is empty
     *
     * @param id Provider id
     * @param updateDto Provider data
     *
     * @returns Updated provider, or `null` when it does not exist
     */
    public update(id: string, updateDto: UpdateProviderDto): Promise<Provider | null> {
        return updateProviderUseCase(this.repository, this.cipher, id, updateDto);
    }

    /**
     * Deletes a provider
     *
     * @param id Provider id
     *
     * @returns `true` when a row was deleted, `false` otherwise
     */
    public delete(id: string): Promise<boolean> {
        return deleteProviderUseCase(this.repository, id);
    }

    /**
     * Tests the credentials of a provider against the source control, changing no record
     *
     * @param id Provider id
     *
     * @returns Outcome of the test
     */
    public async testConnection(id: string): Promise<ProviderConnectionTest> {
        const credentials = await getProviderCredentialsUseCase(this.repository, id);

        return { success: await this.sourceControl.verifyCredentials(credentials) };
    }

    /**
     * Lists the repositories the installation of a provider can reach
     *
     * @param id Provider id
     *
     * @returns Accessible repositories
     */
    public async listRepositories(id: string): Promise<GitRepository[]> {
        const credentials = await getProviderCredentialsUseCase(this.repository, id);

        return listRepositoriesUseCase(this.sourceControl, credentials);
    }

    /**
     * Lists the branches of a repository of a provider
     *
     * @param id Provider id
     * @param repositoryId Repository identifier
     *
     * @returns Accessible branches
     */
    public async listBranches(id: string, repositoryId: number): Promise<GitBranch[]> {
        const credentials = await getProviderCredentialsUseCase(this.repository, id);

        return listBranchesUseCase(this.sourceControl, credentials, repositoryId);
    }
}
