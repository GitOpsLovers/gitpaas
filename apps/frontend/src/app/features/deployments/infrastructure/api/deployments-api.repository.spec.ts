import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { environment } from '@environments/environment';
import { TokenStorageService } from '@features/authentication/infrastructure/storage/token-storage.service';
import { LogEvent } from '@features/logs/domain/models/log-event.model';

import { DeploymentsApiRepository } from './deployments-api.repository';

const DEPLOYMENT_ID = 'dep-1';
const STREAM_URL = `${environment.apiBaseUrl}/logs/${DEPLOYMENT_ID}/stream`;

/**
 * Builds a fake `fetch` `Response` whose body streams the given text chunks.
 *
 * Each chunk is UTF-8 encoded and handed out one `read()` at a time, mirroring
 * the `ReadableStream` reader contract the repository consumes.
 */
function streamResponse(chunks: string[], ok = true, status = 200): Response {
    const encoder = new TextEncoder();
    let index = 0;

    const reader = {
        read: () => (index < chunks.length
            ? Promise.resolve({ value: encoder.encode(chunks[index++]), done: false })
            : Promise.resolve({ value: undefined, done: true })),
    };

    return {
        ok,
        status,
        body: ok ? { getReader: () => reader } : null,
    } as unknown as Response;
}

/**
 * Subscribes to `logs()` and resolves once the observable settles, returning the
 * events seen plus how it terminated.
 */
function collectLogs(
    repository: DeploymentsApiRepository,
    id: string,
): Promise<{ events: LogEvent[]; completed?: boolean; error?: unknown }> {
    return new Promise((resolve) => {
        const events: LogEvent[] = [];

        repository.logs(id).subscribe({
            next: (event) => events.push(event),
            error: (error: unknown) => resolve({ events, error }),
            complete: () => resolve({ events, completed: true }),
        });
    });
}

/**
 * Yields to the microtask/macrotask queue so pending stream reads flush.
 */
function flush(): Promise<void> {
    return new Promise((resolve) => { setTimeout(resolve, 0); });
}

describe('DeploymentsApiRepository', () => {
    let repository: DeploymentsApiRepository;
    let tokenStorage: { accessToken: ReturnType<typeof signal<string | null>> };
    let fetchMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        tokenStorage = { accessToken: signal<string | null>(null) };
        fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);

        TestBed.configureTestingModule({
            providers: [
                DeploymentsApiRepository,
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: TokenStorageService, useValue: tokenStorage },
            ],
        });

        repository = TestBed.inject(DeploymentsApiRepository);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    describe('logs authorization headers', () => {
        it('sends the Bearer token and SSE Accept header when a token is present', async () => {
            tokenStorage.accessToken.set('token-1');
            fetchMock.mockReturnValue(
                Promise.resolve(streamResponse(['data: {"type":"end","status":"success"}\n\n'])),
            );

            await collectLogs(repository, DEPLOYMENT_ID);

            expect(fetchMock).toHaveBeenCalledTimes(1);

            const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
            expect(init.headers).toEqual({
                Accept: 'text/event-stream',
                Authorization: 'Bearer token-1',
            });
        });

        it('omits the Authorization header when the token is null', async () => {
            fetchMock.mockReturnValue(
                Promise.resolve(streamResponse(['data: {"type":"end","status":"success"}\n\n'])),
            );

            await collectLogs(repository, DEPLOYMENT_ID);

            const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
            expect(init.headers).toEqual({ Accept: 'text/event-stream' });
            expect((init.headers as Record<string, string>)['Authorization']).toBeUndefined();
        });
    });

    describe('logs stream URL', () => {
        it('requests the configured logs stream URL for the deployment id', async () => {
            fetchMock.mockReturnValue(
                Promise.resolve(streamResponse(['data: {"type":"end","status":"success"}\n\n'])),
            );

            await collectLogs(repository, DEPLOYMENT_ID);

            const [calledUrl] = fetchMock.mock.calls[0] as [string, RequestInit];
            expect(calledUrl).toBe(STREAM_URL);
        });
    });

    describe('logs SSE parsing', () => {
        it('emits a LogEvent per frame, joins multi-line data, and completes on end', async () => {
            fetchMock.mockReturnValue(Promise.resolve(streamResponse([
                // Frame split across chunks to exercise buffering.
                'data: {"type":"line","dat',
                'a":"first"}\n\n',
                // Multi-line data payload joined with a newline into valid JSON.
                'data: {"type":"line",\ndata: "data":"second"}\n\n',
                // CRLF boundary normalised to a blank line.
                'data: {"type":"end","status":"success"}\r\n\r\n',
            ])));

            const outcome = await collectLogs(repository, DEPLOYMENT_ID);

            expect(outcome.events).toEqual([
                { type: 'line', data: 'first' },
                { type: 'line', data: 'second' },
                { type: 'end', status: 'success' },
            ]);
            expect(outcome.completed).toBe(true);
            expect(outcome.error).toBeUndefined();
        });

        it('ignores non-data blocks such as comments and heartbeats', async () => {
            fetchMock.mockReturnValue(Promise.resolve(streamResponse([
                ': heartbeat\n\n',
                'data: {"type":"line","data":"only"}\n\n',
                'data: {"type":"end","status":"failed"}\n\n',
            ])));

            const outcome = await collectLogs(repository, DEPLOYMENT_ID);

            expect(outcome.events).toEqual([
                { type: 'line', data: 'only' },
                { type: 'end', status: 'failed' },
            ]);
            expect(outcome.completed).toBe(true);
        });
    });

    describe('logs stream failures', () => {
        it('errors when the stream ends without an end event', async () => {
            fetchMock.mockReturnValue(Promise.resolve(streamResponse([
                'data: {"type":"line","data":"partial"}\n\n',
            ])));

            const outcome = await collectLogs(repository, DEPLOYMENT_ID);

            expect(outcome.events).toEqual([{ type: 'line', data: 'partial' }]);
            expect(outcome.completed).toBeUndefined();
            expect(outcome.error).toBeInstanceOf(Error);
            expect((outcome.error as Error).message).toBe('Log stream connection closed');
        });

        it('errors when fetch resolves a non-OK response', async () => {
            fetchMock.mockReturnValue(Promise.resolve(streamResponse([], false, 500)));

            const outcome = await collectLogs(repository, DEPLOYMENT_ID);

            expect(outcome.events).toEqual([]);
            expect(outcome.error).toBeInstanceOf(Error);
            expect((outcome.error as Error).message).toBe('Log stream request failed with status 500');
        });
    });

    describe('logs teardown', () => {
        it('aborts the fetch on unsubscribe without emitting an error', async () => {
            let capturedSignal: AbortSignal | undefined;

            fetchMock.mockImplementation((_url: string, init: RequestInit) => {
                capturedSignal = init.signal ?? undefined;

                return new Promise((_resolve, reject) => {
                    init.signal?.addEventListener('abort', () => {
                        reject(new DOMException('Aborted', 'AbortError'));
                    });
                });
            });

            const errorSpy = vi.fn();
            const nextSpy = vi.fn();
            const subscription = repository.logs(DEPLOYMENT_ID).subscribe({
                next: nextSpy,
                error: errorSpy,
            });

            subscription.unsubscribe();
            await flush();

            expect(capturedSignal?.aborted).toBe(true);
            expect(errorSpy).not.toHaveBeenCalled();
            expect(nextSpy).not.toHaveBeenCalled();
        });
    });
});
