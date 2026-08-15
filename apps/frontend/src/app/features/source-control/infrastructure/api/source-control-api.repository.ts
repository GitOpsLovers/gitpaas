import { HttpClient, httpResource } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { CreateProviderDto } from '../../domain/dtos/create-provider.dto';
import { UpdateProviderDto } from '../../domain/dtos/update-provider.dto';
import { GitBranch } from '../../domain/models/git-branch.model';
import { GitRepository } from '../../domain/models/git-repository.model';
import { Provider, ProviderConnectionTest } from '../../domain/models/provider.model';

import { environment } from '@environments/environment';

@Injectable()

/**
 * Source control API repository
 */
export class SourceControlApiRepository {
    private readonly http = inject(HttpClient);

    private readonly url = `${environment.apiBaseUrl}/source-control`;

    /**
     * Resource with all registered providers
     */
    public readonly providers = httpResource<Provider[]>(() => this.url);

    /**
     * Resource with the repositories accessible to the installation
     */
    public readonly repositories = httpResource<GitRepository[]>(() => `${this.url}/repositories`);

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
        return this.http.delete<void>(`${this.url}/${id}`);
    }

    /**
     * Tests the credentials of a provider against the source control
     *
     * @param id Provider identifier
     *
     * @returns Outcome of the test
     */
    public testConnection(id: string): Observable<ProviderConnectionTest> {
        return this.http.post<ProviderConnectionTest>(`${this.url}/${id}/test`, {});
    }

    /**
     * Resource with the branches of a repository
     *
     * @param repositoryId Accessor returning the repository identifier
     *
     * @returns Resource that resolves to the repository branches
     */
    public branchesByRepository(repositoryId: () => number | undefined) {
        return httpResource<GitBranch[]>(() => {
            const id = repositoryId();

            return id ? `${this.url}/repositories/${id}/branches` : undefined;
        });
    }
}
