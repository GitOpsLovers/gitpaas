import { httpResource } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { type RuntimeLogLine, runtimeLogLineSchema } from '@gitpaas/contracts';
import { Observable, Subscriber } from 'rxjs';

import { environment } from '@environments/environment';
import { TokenStorageService } from '@features/authentication/infrastructure/storage/token-storage.service';

/**
 * Message of the failure the subscriber receives when a message of the stream agrees with no line of the output.
 */
const SCHEMA_FAILURE_MESSAGE = 'Runtime log stream message did not match the runtime log line schema';

@Injectable()

/**
 * Runtime logs API repository
 */
export class RuntimeLogsApiRepository {
    private readonly tokenStorage = inject(TokenStorageService);

    private readonly url = `${environment.apiBaseUrl}/logs/runtime`;

    /**
     * Resource with the output one container already wrote, oldest first
     *
     * @param containerId Accessor returning the container identifier, or undefined to stay idle
     * @param tail Accessor returning the number of the lines of the history to read
     *
     * @returns Resource that resolves to the stored lines of the output of that container
     */
    public runtimeLogs(containerId: () => string | undefined, tail: () => number) {
        return httpResource<RuntimeLogLine[]>(() => {
            const id = containerId();

            return id ? `${this.url}?containerId=${id}&tail=${tail()}` : undefined;
        });
    }

    /**
     * Streams the output one container writes over Server-Sent Events.
     *
     * @param containerId Identifier of the container to stream
     *
     * @returns Lines of the output the container writes while the subscription stays open
     */
    public stream(containerId: string): Observable<RuntimeLogLine> {
        return new Observable<RuntimeLogLine>((subscriber) => {
            const controller = new AbortController();

            this.streamLines(containerId, controller.signal, subscriber);

            return () => { controller.abort(); };
        });
    }

    /**
     * Opens the SSE stream over `fetch`, parses `data:` frames and forwards the decoded lines to the subscriber.
     *
     * @param containerId Identifier of the container to stream
     * @param signal Abort signal wired to the subscription teardown
     * @param subscriber Subscriber receiving the parsed lines of the output
     */
    private async streamLines(
        containerId: string,
        signal: AbortSignal,
        subscriber: Subscriber<RuntimeLogLine>,
    ): Promise<void> {
        const accessToken = this.tokenStorage.accessToken();

        const headers: Record<string, string> = { Accept: 'text/event-stream' };

        if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`;
        }

        try {
            const response = await fetch(`${this.url}/stream?containerId=${containerId}`, { headers, signal });

            if (!response.ok || !response.body) {
                throw new Error(`Runtime log stream request failed with status ${response.status}`);
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

                    const line = this.parseSseEvent(rawEvent);

                    if (line) {
                        subscriber.next(line);
                    }

                    boundary = buffer.indexOf('\n\n');
                }
            }

            // The daemon closed the stream: the container stopped, so the output ends here.
            subscriber.complete();
        } catch (error) {
            // An aborted fetch is the expected teardown on unsubscribe.
            if (signal.aborted) {
                return;
            }

            subscriber.error(error instanceof Error ? error : new Error('Runtime log stream connection closed'));
        }
    }

    /**
     * Parses one raw SSE event block into a `RuntimeLogLine`.
     *
     * @param rawEvent Raw text of a single SSE event, without the trailing blank line
     *
     * @throws Error When the payload is no JSON, or when it agrees with no line of the output
     *
     * @returns The parsed line of the output, or null when the block carries no data
     */
    private parseSseEvent(rawEvent: string): RuntimeLogLine | null {
        const dataLines = rawEvent
            .split('\n')
            .filter((line) => line.startsWith('data:'))
            .map((line) => line.slice('data:'.length).replace(/^ /, ''));

        if (dataLines.length === 0) {
            return null;
        }

        const parsed = runtimeLogLineSchema.safeParse(this.decodeJson(dataLines.join('\n')));

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
