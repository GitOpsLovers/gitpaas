import { HttpClient, httpResource } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { Deployment } from '../../domain/models/deployment.model';

import { LogEvent } from '@features/logs/domain/models/log-event.model';

@Injectable()

/**
 * Deployments API repository
 */
export class DeploymentsApiRepository {
    private readonly http = inject(HttpClient);

    private readonly url = 'http://localhost:3000/api/v1/deployments';

    private readonly logsUrl = 'http://localhost:3000/api/v1/logs';

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
    public remove(id: string): Observable<null> {
        return this.http.delete<null>(`${this.url}/${id}`);
    }

    /**
     * Streams a deployment's real-time log over Server-Sent Events.
     *
     * Buffered output is replayed first, then live lines; the stream completes
     * when the run ends. The underlying `EventSource` is closed on unsubscribe.
     *
     * @param deploymentId Identifier of the deployment to stream
     *
     * @returns Log events for the deployment
     */
    public logs(deploymentId: string): Observable<LogEvent> {
        return new Observable<LogEvent>((subscriber) => {
            const source = new EventSource(`${this.logsUrl}/${deploymentId}/stream`);

            source.onmessage = (message) => {
                const event = JSON.parse(message.data) as LogEvent;

                subscriber.next(event);

                if (event.type === 'end') {
                    source.close();
                    subscriber.complete();
                }
            };

            source.onerror = () => {
                // The browser auto-reconnects on transient errors; surface a hard
                // failure only once the connection is closed for good.
                if (source.readyState === EventSource.CLOSED) {
                    subscriber.error(new Error('Log stream connection closed'));
                }
            };

            return () => { source.close(); };
        });
    }
}
