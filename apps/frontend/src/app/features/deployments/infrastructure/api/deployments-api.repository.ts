import { httpResource } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';

import { Deployment } from '../../domain/models/deployment.model';

@Injectable()

/**
 * Deployments API repository
 */
export class DeploymentsApiRepository {
    private readonly url = 'http://localhost:3000/api/v1/deployments';

    /**
     * Trigger for the deploy command. A monotonically increasing `nonce` lets the same service be
     * deployed again: changing the signal value re-runs the command resource even when the payload
     * is identical.
     */
    private readonly deployTrigger = signal<{ serviceId: string; nonce: number } | undefined>(undefined);

    /**
     * Command resource that triggers a deployment. It is idle until `deploy()` is called, then it
     * POSTs the request and exposes its lifecycle through `isLoading()`/`value()`/`error()`.
     */
    public readonly deployment = httpResource<Deployment>(() => {
        const trigger = this.deployTrigger();

        return trigger ? { url: this.url, method: 'POST', body: { serviceId: trigger.serviceId } } : undefined;
    });

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
     * Triggers a deployment for a service through the `deployment` command resource
     *
     * @param serviceId Identifier of the service to deploy
     */
    public deploy(serviceId: string): void {
        this.deployTrigger.update((current) => ({ serviceId, nonce: (current?.nonce ?? 0) + 1 }));
    }
}
