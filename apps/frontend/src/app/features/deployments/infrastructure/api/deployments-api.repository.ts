import { HttpClient, httpResource } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import {
    type Deployment,
    type DeploymentLogArchive,
    type LogEvent,
    type TriggerDeploymentDto,
    logEventSchema,
} from '@gitpaas/contracts';
import { forkJoin, Observable, of, Subscriber } from 'rxjs';

import { environment } from '@environments/environment';
import { TokenStorageService } from '@features/authentication/infrastructure/storage/token-storage.service';

/**
 * Message of the failure the subscriber receives when a message of the stream agrees with no kind of the union.
 */
const SCHEMA_FAILURE_MESSAGE = 'Log stream message did not match the log event schema';

@Injectable()

/**
 * Deployments API repository
 */
export class DeploymentsApiRepository {
    private readonly http = inject(HttpClient);

    private readonly tokenStorage = inject(TokenStorageService);

    private readonly url = `${environment.apiBaseUrl}/deployments`;

    private readonly logsUrl = `${environment.apiBaseUrl}/logs`;

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
     * Resource with the deployments of several services, one request for each service, keyed by the service
     *
     * @param serviceIds Accessor returning the identifiers of the services to read
     *
     * @returns Resource that resolves to the deployments of each service
     */
    public deploymentsByServices(serviceIds: () => string[]) {
        return rxResource<Record<string, Deployment[]>, string[]>({
            params: serviceIds,
            defaultValue: {},
            stream: ({ params }) => this.readDeploymentsOf(params),
        });
    }

    /**
     * Resource with the names of the compose services the last deployment of a service declares
     *
     * @param serviceId Accessor returning the service identifier
     *
     * @returns Resource that resolves to the compose services of the recipe
     */
    public composeServicesByService(serviceId: () => string | undefined) {
        return httpResource<string[]>(() => {
            const id = serviceId();

            return id ? `${this.url}/compose-services?serviceId=${id}` : undefined;
        });
    }

    /**
     * Resource with the durable archive of the output of a deployment
     *
     * @param deploymentId Accessor returning the deployment identifier, or undefined to stay idle
     *
     * @returns Resource that resolves to the archived entries and the state of the archive
     */
    public logArchive(deploymentId: () => string | undefined) {
        return httpResource<DeploymentLogArchive>(() => {
            const id = deploymentId();

            return id ? `${this.logsUrl}?deploymentId=${id}` : undefined;
        });
    }

    /**
     * Reads the deployments of each given service, with one request for each one.
     *
     * @param serviceIds Identifiers of the services to read
     *
     * @returns The deployments of each service, keyed by the service
     */
    private readDeploymentsOf(serviceIds: string[]): Observable<Record<string, Deployment[]>> {
        if (serviceIds.length === 0) {
            return of({});
        }

        const requests: Record<string, Observable<Deployment[]>> = {};

        for (const id of serviceIds) {
            // eslint-disable-next-line security/detect-object-injection
            requests[id] = this.http.get<Deployment[]>(`${this.url}?serviceId=${id}`);
        }

        return forkJoin(requests);
    }

    /**
     * Triggers a deployment for a service
     *
     * @param serviceId Identifier of the service to deploy
     *
     * @returns The created deployment
     */
    public deploy(serviceId: string): Observable<Deployment> {
        const body: TriggerDeploymentDto = { serviceId };

        return this.http.post<Deployment>(this.url, body);
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
     * @param deploymentId Identifier of the deployment to stream
     *
     * @returns Log events for the deployment
     */
    public logs(deploymentId: string): Observable<LogEvent> {
        return new Observable<LogEvent>((subscriber) => {
            const controller = new AbortController();

            this.streamLogs(deploymentId, controller.signal, subscriber);

            return () => { controller.abort(); };
        });
    }

    /**
     * Opens the SSE stream over `fetch`, parses `data:` frames and forwards the decoded log events to the subscriber.
     *
     * @param deploymentId Identifier of the deployment to stream
     * @param signal Abort signal wired to the subscription teardown
     * @param subscriber Subscriber receiving the parsed log events
     */
    private async streamLogs(
        deploymentId: string,
        signal: AbortSignal,
        subscriber: Subscriber<LogEvent>,
    ): Promise<void> {
        const accessToken = this.tokenStorage.accessToken();

        const headers: Record<string, string> = { Accept: 'text/event-stream' };

        if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`;
        }

        try {
            const response = await fetch(`${this.logsUrl}/${deploymentId}/stream`, { headers, signal });

            if (!response.ok || !response.body) {
                throw new Error(`Log stream request failed with status ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            for (;;) {
                const { value, done } = await reader.read();

                if (done) {
                    break;
                }

                // Normalise CRLF so event boundaries are always a blank line.
                buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');

                let boundary = buffer.indexOf('\n\n');

                while (boundary !== -1) {
                    const rawEvent = buffer.slice(0, boundary);

                    buffer = buffer.slice(boundary + 2);

                    const event = this.parseSseEvent(rawEvent);

                    if (event) {
                        subscriber.next(event);

                        if (event.type === 'end') {
                            subscriber.complete();

                            return;
                        }
                    }

                    boundary = buffer.indexOf('\n\n');
                }
            }

            // The stream closed without an explicit end event: a hard failure.
            subscriber.error(new Error('Log stream connection closed'));
        } catch (error) {
            // An aborted fetch is the expected teardown on unsubscribe.
            if (signal.aborted) {
                return;
            }

            subscriber.error(error instanceof Error ? error : new Error('Log stream connection closed'));
        }
    }

    /**
     * Parses one raw SSE event block into a `LogEvent`.
     *
     * @param rawEvent Raw text of a single SSE event, without the trailing blank line
     *
     * @throws Error When the payload is no JSON, or when it agrees with no kind of the union
     *
     * @returns The parsed log event, or null when the block carries no data
     */
    private parseSseEvent(rawEvent: string): LogEvent | null {
        const dataLines = rawEvent
            .split('\n')
            .filter((line) => line.startsWith('data:'))
            .map((line) => line.slice('data:'.length).replace(/^ /, ''));

        if (dataLines.length === 0) {
            return null;
        }

        const parsed = logEventSchema.safeParse(this.decodeJson(dataLines.join('\n')));

        if (!parsed.success) {
            throw new Error(SCHEMA_FAILURE_MESSAGE);
        }

        return parsed.data;
    }

    /**
     * Decodes the JSON payload of one SSE event.
     *
     * @param payload Raw JSON text of the `data:` field lines
     *
     * @throws Error When the payload is no JSON
     *
     * @returns The decoded value, which still has to agree with the schema
     */
    private decodeJson(payload: string): unknown {
        try {
            return JSON.parse(payload);
        } catch {
            throw new Error(SCHEMA_FAILURE_MESSAGE);
        }
    }
}
