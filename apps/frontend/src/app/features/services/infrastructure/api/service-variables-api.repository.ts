import { HttpClient, httpResource } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { ServiceVariable, SetServiceVariableDto, UpdateServiceVariableDto } from '@gitpaas/contracts';
import { Observable } from 'rxjs';

import { environment } from '@environments/environment';

@Injectable()

/**
 * Service variables API repository
 */
export class ServiceVariablesApiRepository {
    private readonly http = inject(HttpClient);

    private readonly url = `${environment.apiBaseUrl}/services`;

    /**
     * Resource with the variables of a service
     *
     * @param serviceId Accessor returning the service identifier
     *
     * @returns Resource that resolves to the variables of the service
     */
    public variablesByService(serviceId: () => string | undefined) {
        return httpResource<ServiceVariable[]>(() => {
            const id = serviceId();

            return id ? `${this.url}/${id}/variables` : undefined;
        });
    }

    /**
     * Sets a new variable on a service
     *
     * @param serviceId Service identifier
     * @param dto Name, value and kind of the variable
     *
     * @returns The stored variable
     */
    public set(serviceId: string, dto: SetServiceVariableDto): Observable<ServiceVariable> {
        return this.http.post<ServiceVariable>(`${this.url}/${serviceId}/variables`, dto);
    }

    /**
     * Changes the name or the value of a variable
     *
     * @param serviceId Service identifier
     * @param id Variable identifier
     * @param dto Fields to change
     *
     * @returns The changed variable
     */
    public update(serviceId: string, id: string, dto: UpdateServiceVariableDto): Observable<ServiceVariable> {
        return this.http.put<ServiceVariable>(`${this.url}/${serviceId}/variables/${id}`, dto);
    }

    /**
     * Removes a variable from a service
     *
     * @param serviceId Service identifier
     * @param id Variable identifier
     */
    public remove(serviceId: string, id: string): Observable<void> {
        // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
        return this.http.delete<void>(`${this.url}/${serviceId}/variables/${id}`);
    }
}
