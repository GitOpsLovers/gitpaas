import { HttpClient, httpResource } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { CreateNamespaceDto, Namespace, UpdateNamespaceDto } from '@gitpaas/contracts';
import { Observable } from 'rxjs';

import { environment } from '@environments/environment';

@Injectable()

/**
 * Namespaces API repository
 */
export class NamespacesApiRepository {
    private readonly http = inject(HttpClient);

    private readonly url = `${environment.apiBaseUrl}/namespaces`;

    /**
     * Resource with all namespaces
     */
    public readonly namespaces = httpResource<Namespace[]>(() => this.url);

    /**
     * Resource with a single namespace by id
     *
     * @param id Accessor returning the namespace identifier
     *
     * @returns Resource that resolves to the found namespace
     */
    public namespaceById(id: () => string | undefined) {
        return httpResource<Namespace>(() => {
            const namespaceId = id();

            return namespaceId ? `${this.url}/${namespaceId}` : undefined;
        });
    }

    /**
     * Creates a new namespace
     *
     * @param dto Data for creating the namespace
     *
     * @returns Created namespace
     */
    public create(dto: CreateNamespaceDto): Observable<Namespace> {
        return this.http.post<Namespace>(this.url, dto);
    }

    /**
     * Updates an existing namespace
     *
     * @param id Namespace identifier
     * @param dto Data for updating the namespace
     *
     * @returns Updated namespace
     */
    public update(id: string, dto: UpdateNamespaceDto): Observable<Namespace> {
        return this.http.put<Namespace>(`${this.url}/${id}`, dto);
    }

    /**
     * Deletes a namespace
     *
     * @param id Namespace identifier
     */
    public delete(id: string): Observable<void> {
        // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
        return this.http.delete<void>(`${this.url}/${id}`);
    }
}
