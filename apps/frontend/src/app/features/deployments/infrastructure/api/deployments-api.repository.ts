import { HttpClient, httpResource } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { Deployment } from '../../domain/models/deployment.model';

@Injectable()

/**
 * Deployments API repository
 */
export class DeploymentsApiRepository {
    private readonly http = inject(HttpClient);

    private readonly url = 'http://localhost:3000/api/v1/deployments';

    /**
     * Resource with the deployment history of a service, most recent first
     *
     * @param serviceId Accessor returning the service identifier
     *
     * @returns Resource that resolves to the service deployments
     */
    public deploymentsByService(serviceId: () => string | undefined) {
        return httpResource<Deployment[]>(() => {
            const id = serviceId();

            return id ? `${this.url}?serviceId=${id}` : undefined;
        });
    }

    /**
     * Triggers a deployment for a service
     *
     * @param serviceId Identifier of the service to deploy
     *
     * @returns The created deployment
     */
    public deploy(serviceId: string): Observable<Deployment> {
        return this.http.post<Deployment>(this.url, { serviceId });
    }

    /**
     * Deletes a deployment
     *
     * @param id Identifier of the deployment to delete
     */
    public remove(id: string): Observable<void> {
        return this.http.delete<void>(`${this.url}/${id}`);
    }
}
