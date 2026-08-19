import { HttpClient, httpResource } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { CompleteProviderRegistrationDto } from '../../domain/dtos/complete-provider-registration.dto';
import { ConvertProviderRegistrationDto } from '../../domain/dtos/convert-provider-registration.dto';
import { CreateProviderDto } from '../../domain/dtos/create-provider.dto';
import { StartProviderRegistrationDto } from '../../domain/dtos/start-provider-registration.dto';
import { UpdateProviderDto } from '../../domain/dtos/update-provider.dto';
import { GitBranch } from '../../domain/models/git-branch.model';
import { GitRepository } from '../../domain/models/git-repository.model';
import { ConvertedProviderRegistration, StartedProviderRegistration } from '../../domain/models/provider-registration.model';
import { Provider, ProviderConnectionTest } from '../../domain/models/provider.model';

import { environment } from '@environments/environment';

@Injectable()

/**
 * Providers API repository
 */
export class ProvidersApiRepository {
    private readonly http = inject(HttpClient);

    private readonly url = `${environment.apiBaseUrl}/providers`;

    /**
     * Resource with all registered providers
     */
    public readonly providers = httpResource<Provider[]>(() => this.url);

    /**
     * Resource with the repositories a provider can reach
     *
     * @param providerId Accessor returning the provider identifier
     *
     * @returns Resource that resolves to the accessible repositories
     */
    public repositoriesByProvider(providerId: () => string | undefined) {
        return httpResource<GitRepository[]>(() => {
            const id = providerId();

            return id ? `${this.url}/${id}/repositories` : undefined;
        });
    }

    /**
     * Resource with a single provider by id
     *
     * @param id Accessor returning the provider identifier
     *
     * @returns Resource that resolves to the found provider
     */
    public providerById(id: () => string | undefined) {
        return httpResource<Provider>(() => {
            const providerId = id();

            return providerId ? `${this.url}/${providerId}` : undefined;
        });
    }

    /**
     * Registers a new provider
     *
     * @param dto Data for registering the provider
     *
     * @returns Created provider
     */
    public create(dto: CreateProviderDto): Observable<Provider> {
        return this.http.post<Provider>(this.url, dto);
    }

    /**
     * Starts the registration of a GitHub App the platform creates
     *
     * @param dto Name and owner of the application
     *
     * @returns The state of the registration, the manifest and the address of GitHub
     */
    public startRegistration(dto: StartProviderRegistrationDto): Observable<StartedProviderRegistration> {
        return this.http.post<StartedProviderRegistration>(`${this.url}/registrations`, dto);
    }

    /**
     * Converts the temporary code GitHub handed back after the creation
     *
     * @param state State of the registration
     * @param dto Temporary code of the manifest
     *
     * @returns The state of the registration and the short name of the application
     */
    public convertRegistration(state: string, dto: ConvertProviderRegistrationDto): Observable<ConvertedProviderRegistration> {
        return this.http.post<ConvertedProviderRegistration>(`${this.url}/registrations/${state}/conversion`, dto);
    }

    /**
     * Ends a registration, and gives the provider it wrote
     *
     * @param state State of the registration
     * @param dto Identifier of the installation GitHub handed back
     *
     * @returns Created provider
     */
    public completeRegistration(state: string, dto: CompleteProviderRegistrationDto): Observable<Provider> {
        return this.http.post<Provider>(`${this.url}/registrations/${state}/completion`, dto);
    }

    /**
     * Updates an existing provider
     *
     * @param id Provider identifier
     * @param dto Data for updating the provider
     *
     * @returns Updated provider
     */
    public update(id: string, dto: UpdateProviderDto): Observable<Provider> {
        return this.http.put<Provider>(`${this.url}/${id}`, dto);
    }

    /**
     * Deletes a provider
     *
     * @param id Provider identifier
     */
    public delete(id: string): Observable<void> {
        // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
        return this.http.delete<void>(`${this.url}/${id}`);
    }

    /**
     * Tests the credentials of a provider against GitHub
     *
     * @param id Provider identifier
     *
     * @returns Outcome of the test
     */
    public testConnection(id: string): Observable<ProviderConnectionTest> {
        return this.http.post<ProviderConnectionTest>(`${this.url}/${id}/test`, {});
    }

    /**
     * Resource with the branches of a repository of a provider
     *
     * @param providerId Accessor returning the provider identifier
     * @param repositoryId Accessor returning the repository identifier
     *
     * @returns Resource that resolves to the repository branches
     */
    public branchesByRepository(providerId: () => string | undefined, repositoryId: () => number | undefined) {
        return httpResource<GitBranch[]>(() => {
            const provider = providerId();
            const id = repositoryId();

            return provider && id ? `${this.url}/${provider}/repositories/${id}/branches` : undefined;
        });
    }
}
