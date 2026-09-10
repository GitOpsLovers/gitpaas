import { httpResource } from '@angular/common/http';
import { Injectable } from '@angular/core';
import type { Volume } from '@gitpaas/contracts';

import { environment } from '@environments/environment';

@Injectable()

/**
 * Volumes API repository
 */
export class VolumesApiRepository {
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
