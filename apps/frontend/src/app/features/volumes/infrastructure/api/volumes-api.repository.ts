import { HttpClient, httpResource } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { AttachVolumeDto, CreateVolumeDto, UpdateVolumeDto, Volume } from '@gitpaas/contracts';
import { Observable } from 'rxjs';

import { environment } from '@environments/environment';

@Injectable()

/**
 * Volumes API repository
 */
export class VolumesApiRepository {
    private readonly http = inject(HttpClient);

    private readonly servicesUrl = `${environment.apiBaseUrl}/services`;

    /**
     * Resource with the volumes of a service, each one with the state the daemon gives it
     *
     * @param serviceId Accessor returning the service identifier
     *
     * @returns Resource that resolves to the volumes of the service
     */
    public volumesByService(serviceId: () => string | undefined) {
        return httpResource<Volume[]>(() => {
            const id = serviceId();

            return id ? this.volumesUrl(id) : undefined;
        });
    }

    /**
     * Creates a volume of a service, and attaches it in the same call
     *
     * @param serviceId Service identifier
     * @param dto Name of the new volume, and the mount it takes
     *
     * @returns Created volume
     */
    public create(serviceId: string, dto: CreateVolumeDto): Observable<Volume> {
        return this.http.post<Volume>(this.volumesUrl(serviceId), dto);
    }

    /**
     * Renames a volume the service already holds
     *
     * @param serviceId Service identifier
     * @param id Volume identifier
     * @param dto New display name of the volume
     *
     * @returns Renamed volume
     */
    public rename(serviceId: string, id: string, dto: UpdateVolumeDto): Observable<Volume> {
        return this.http.put<Volume>(`${this.volumesUrl(serviceId)}/${id}`, dto);
    }

    /**
     * Attaches a volume to one service of the Compose file of the service
     *
     * @param serviceId Service identifier
     * @param id Volume identifier
     * @param dto Mount the volume takes inside the container
     */
    public attach(serviceId: string, id: string, dto: AttachVolumeDto): Observable<void> {
        // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
        return this.http.put<void>(`${this.volumesUrl(serviceId)}/${id}/mount`, dto);
    }

    /**
     * Detaches a volume from the service of the Compose file that mounts it
     *
     * @param serviceId Service identifier
     * @param id Volume identifier
     */
    public detach(serviceId: string, id: string): Observable<void> {
        // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
        return this.http.delete<void>(`${this.volumesUrl(serviceId)}/${id}/mount`);
    }

    /**
     * Builds the volumes collection URL of a service
     *
     * @param serviceId Service identifier
     *
     * @returns Volumes collection URL of that service
     */
    private volumesUrl(serviceId: string): string {
        return `${this.servicesUrl}/${serviceId}/volumes`;
    }
}
