import { HttpClient, httpResource } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';

import { CreateServiceDto } from '../../domain/dtos/create-service.dto';
import { UpdateServiceDto } from '../../domain/dtos/update-service.dto';
import { Service } from '../../domain/models/service.model';

@Injectable()

/**
 * Services API repository
 */
export class ServicesApiRepository {
    private readonly http = inject(HttpClient);

    private readonly url = 'http://localhost:3000/api/v1/services';

    /**
     * Identifier of the project whose services are being listed
     */
    public readonly projectId = signal<string | undefined>(undefined);

    /**
     * Resource with the services of the selected project
     */
    public readonly services = httpResource<Service[]>(() =>
        this.projectId() ? `${this.url}?projectId=${this.projectId()}` : undefined);

    /**
     * Get a service by id
     *
     * @param id Service identifier
     *
     * @returns Observable that resolves to the found service
     */
    public getById(id: string): Observable<Service> {
        return this.http.get<Service>(`${this.url}/${id}`);
    }

    /**
     * Create a new service
     *
     * @param dto Data for creating a new service
     *
     * @returns Created service
     */
    public create(dto: CreateServiceDto): Observable<Service> {
        return this.http.post<Service>(this.url, dto);
    }

    /**
     * Updates an existing service
     *
     * @param id Service identifier
     * @param dto Data for updating the service
     *
     * @returns Updated service
     */
    public update(id: string, dto: UpdateServiceDto): Observable<Service> {
        return this.http.put<Service>(`${this.url}/${id}`, dto);
    }

    /**
     * Deletes a service
     *
     * @param id Service identifier
     */
    public delete(id: string): Observable<void> {
        return this.http.delete<void>(`${this.url}/${id}`);
    }
}
