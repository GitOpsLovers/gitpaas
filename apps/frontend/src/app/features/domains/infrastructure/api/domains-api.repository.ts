import { HttpClient, httpResource } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { ClaimDomainDto, Domain, UpdateDomainDto } from '@gitpaas/contracts';
import { Observable } from 'rxjs';

import { environment } from '@environments/environment';

@Injectable()

/**
 * Domains API repository
 */
export class DomainsApiRepository {
    private readonly http = inject(HttpClient);

    private readonly url = `${environment.apiBaseUrl}/services`;

    /**
     * Resource with the domains a service holds
     *
     * @param serviceId Accessor returning the service identifier
     *
     * @returns Resource that resolves to the domains of the service
     */
    public domainsByService(serviceId: () => string | undefined) {
        return httpResource<Domain[]>(() => {
            const id = serviceId();

            return id ? `${this.url}/${id}/domains` : undefined;
        });
    }

    /**
     * Claims a domain for a service
     *
     * @param serviceId Service identifier
     * @param dto Host, compose service, port and choice of HTTPS
     *
     * @returns The claimed domain
     */
    public claim(serviceId: string, dto: ClaimDomainDto): Observable<Domain> {
        return this.http.post<Domain>(`${this.url}/${serviceId}/domains`, dto);
    }

    /**
     * Changes a domain a service already holds
     *
     * @param serviceId Service identifier
     * @param id Domain identifier
     * @param dto Fields to change
     *
     * @returns The changed domain
     */
    public update(serviceId: string, id: string, dto: UpdateDomainDto): Observable<Domain> {
        return this.http.put<Domain>(`${this.url}/${serviceId}/domains/${id}`, dto);
    }

    /**
     * Removes a domain from a service
     *
     * @param serviceId Service identifier
     * @param id Domain identifier
     */
    public remove(serviceId: string, id: string): Observable<null> {
        return this.http.delete<null>(`${this.url}/${serviceId}/domains/${id}`);
    }
}
