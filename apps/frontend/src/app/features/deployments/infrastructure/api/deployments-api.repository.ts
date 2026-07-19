import { HttpClient, httpResource } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, Subscriber } from 'rxjs';

import { Deployment } from '../../domain/models/deployment.model';

import { environment } from '@environments/environment';
import { TokenStorageService } from '@features/authentication/infrastructure/storage/token-storage.service';
import { LogEvent } from '@features/logs/domain/models/log-event.model';

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
     * when the run ends. Uses `fetch` with a `ReadableStream` reader (rather than
     * the native `EventSource`, which cannot set headers) so the current access
     * token can be attached as `Authorization: Bearer <token>` to satisfy the
     * auth-by-default guard. The connection is aborted on unsubscribe.
     *
     * @param deploymentId Identifier of the deployment to stream
     *
     * @returns Log events for the deployment
     */
    public logs(deploymentId: string): Observable<LogEvent> {
        return new Observable<LogEvent>((subscriber) => {
            const controller = new AbortController();

            void this.streamLogs(deploymentId, controller.signal, subscriber);

            return () => { controller.abort(); };
        });
    }

    /**
     * Opens the SSE stream over `fetch`, parses `data:` frames and forwards the
     * decoded log events to the subscriber.
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
     * Collects the `data:` field lines (stripping the optional single leading
     * space per the SSE spec), joins multi-line payloads with a newline and
     * decodes the JSON. Non-data blocks (comments, heartbeats) yield null.
     *
     * @param rawEvent Raw text of a single SSE event, without the trailing blank line
     *
     * @returns The decoded log event, or null when the block carries no data
     */
    private parseSseEvent(rawEvent: string): LogEvent | null {
        const dataLines = rawEvent
            .split('\n')
            .filter((line) => line.startsWith('data:'))
            .map((line) => line.slice('data:'.length).replace(/^ /, ''));

        if (dataLines.length === 0) {
            return null;
        }

        return JSON.parse(dataLines.join('\n')) as LogEvent;
    }
}
