import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { completeProviderRegistrationUseCase } from '../../application/complete-provider-registration.use-case';
import { convertProviderRegistrationUseCase } from '../../application/convert-provider-registration.use-case';
import { createProviderUseCase } from '../../application/create-provider.use-case';
import { deleteProviderUseCase } from '../../application/delete-provider.use-case';
import { findProviderByIdUseCase } from '../../application/find-provider-by-id.use-case';
import { getAllProvidersUseCase } from '../../application/get-all-providers.use-case';
import { getProviderCredentialsUseCase } from '../../application/get-provider-credentials.use-case';
import { listBranchesUseCase } from '../../application/list-branches.use-case';
import { listRepositoriesUseCase } from '../../application/list-repositories.use-case';
import { startProviderRegistrationUseCase } from '../../application/start-provider-registration.use-case';
import { testProviderConnectionUseCase } from '../../application/test-provider-connection.use-case';
import { updateProviderUseCase } from '../../application/update-provider.use-case';
import { PROVIDER_REGISTRATION_REDIRECT_PATH, PROVIDER_REGISTRATION_SETUP_PATH } from '../../domain/constants/provider-registration.constants';
import { CompleteProviderRegistrationDto } from '../../domain/dtos/complete-provider-registration.dto';
import { ConvertProviderRegistrationDto } from '../../domain/dtos/convert-provider-registration.dto';
import { CreateProviderDto } from '../../domain/dtos/create-provider.dto';
import { StartProviderRegistrationDto } from '../../domain/dtos/start-provider-registration.dto';
import { UpdateProviderDto } from '../../domain/dtos/update-provider.dto';
import { GitBranch } from '../../domain/models/git-branch.models';
import { GitRepository } from '../../domain/models/git-repository.models';
import {
    ConvertedProviderRegistration,
    ProviderAppManifestUrls,
    ProviderAppOwnerType,
    StartedProviderRegistration,
} from '../../domain/models/provider-registration.models';
import { Provider, ProviderConnectionTest } from '../../domain/models/provider.models';
import type { ProviderClient } from '../../domain/ports/provider-client.port';
import type { ProviderRegistrationsRepository } from '../../domain/repositories/provider-registrations.repository';
import type { ProvidersRepository } from '../../domain/repositories/providers.repository';
import { DatabaseProviderRegistrationsRepository } from '../../infrastructure/database/db-provider-registrations.repository';
import { DatabaseProvidersRepository } from '../../infrastructure/database/db-providers.repository';
import { GithubProviderClientAdapter } from '../../infrastructure/github/github-provider-client.adapter';

import type { SecretCipher } from '@core/domain/ports/secret-cipher.port';
import { SecretCipherAdapter } from '@core/infrastructure/crypto/secret-cipher.adapter';
import { enrichTelemetry } from '@core/infrastructure/telemetry/telemetry.context';

/**
 * Providers service
 */
@Injectable()
export class ProvidersService {
    private readonly manifestUrls: ProviderAppManifestUrls;

    constructor(
        @Inject(DatabaseProvidersRepository)
        private readonly repository: ProvidersRepository,
        @Inject(DatabaseProviderRegistrationsRepository)
        private readonly registrationsRepository: ProviderRegistrationsRepository,
        @Inject(SecretCipherAdapter)
        private readonly cipher: SecretCipher,
        @Inject(GithubProviderClientAdapter)
        private readonly providerClient: ProviderClient,
        config: ConfigService,
    ) {
        const baseUrl = config.getOrThrow<string>('APP_BASE_URL').trim().replace(/\/+$/, '');

        this.manifestUrls = {
            homepageUrl: baseUrl,
            redirectUrl: `${baseUrl}${PROVIDER_REGISTRATION_REDIRECT_PATH}`,
            setupUrl: `${baseUrl}${PROVIDER_REGISTRATION_SETUP_PATH}`,
        };
    }

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
     * Tests the credentials of a provider against the provider, changing no record
     *
     * @param id Provider id
     *
     * @returns Outcome of the test
     */
    public async testConnection(id: string): Promise<ProviderConnectionTest> {
        const credentials = await getProviderCredentialsUseCase(this.repository, id);

        return testProviderConnectionUseCase(this.providerClient, credentials);
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

        return listRepositoriesUseCase(this.providerClient, credentials);
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

        return listBranchesUseCase(this.providerClient, credentials, repositoryId);
    }

    /**
     * Starts the registration of a GitHub App the platform creates
     *
     * @param startDto Name and owner the operator gave
     *
     * @returns The state of the registration, the manifest and the address of GitHub
     */
    public startRegistration(startDto: StartProviderRegistrationDto): Promise<StartedProviderRegistration> {
        return startProviderRegistrationUseCase(
            this.repository,
            this.registrationsRepository,
            {
                name: startDto.name,
                ownerType: startDto.ownerType,
                ownerLogin: startDto.ownerType === ProviderAppOwnerType.Organization
                    ? startDto.ownerLogin ?? null
                    : null,
            },
            this.manifestUrls,
        );
    }

    /**
     * Converts the temporary code of a manifest into the configuration of the application
     *
     * @param state State of the registration
     * @param convertDto Temporary code GitHub handed back
     *
     * @returns The state of the registration and the short name of the application
     */
    public async convertRegistration(state: string, convertDto: ConvertProviderRegistrationDto): Promise<ConvertedProviderRegistration> {
        const registration = await convertProviderRegistrationUseCase(
            this.registrationsRepository,
            this.providerClient,
            state,
            convertDto.code,
        );

        return { state: registration.state, appSlug: registration.appSlug };
    }

    /**
     * Ends a registration, writing the provider and removing the pending registration
     *
     * @param state State of the registration
     * @param completeDto Identifier of the installation GitHub handed back
     *
     * @returns Created provider
     */
    public async completeRegistration(state: string, completeDto: CompleteProviderRegistrationDto): Promise<Provider> {
        const provider = await completeProviderRegistrationUseCase(
            this.repository,
            this.registrationsRepository,
            state,
            completeDto.installationId,
        );

        enrichTelemetry({ 'provider.id': provider.id });

        return provider;
    }
}
