import { httpResource } from '@angular/common/http';
import { Injectable } from '@angular/core';
import type { DockerContainer, DockerImage, DockerNetwork, DockerVolume } from '@gitpaas/contracts';

import { environment } from '@environments/environment';

@Injectable()

/**
 * Docker API repository
 */
export class DockerApiRepository {
    private readonly url = `${environment.apiBaseUrl}/docker`;

    /**
     * Resource with every container of the host, the stopped ones included.
     *
     * @returns Resource that resolves to the containers of the host
     */
    public containers() {
        return httpResource<DockerContainer[]>(() => `${this.url}/containers`);
    }

    /**
     * Resource with every image of the host.
     *
     * @returns Resource that resolves to the images of the host
     */
    public images() {
        return httpResource<DockerImage[]>(() => `${this.url}/images`);
    }

    /**
     * Resource with every volume of the host.
     *
     * @returns Resource that resolves to the volumes of the host
     */
    public volumes() {
        return httpResource<DockerVolume[]>(() => `${this.url}/volumes`);
    }

    /**
     * Resource with every network of the host.
     *
     * @returns Resource that resolves to the networks of the host
     */
    public networks() {
        return httpResource<DockerNetwork[]>(() => `${this.url}/networks`);
    }
}
