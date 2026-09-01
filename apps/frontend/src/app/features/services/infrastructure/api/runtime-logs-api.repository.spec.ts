import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { RuntimeLogLine } from '@gitpaas/contracts';

import { RuntimeLogsApiRepository } from './runtime-logs-api.repository';

import { environment } from '@environments/environment';
import { TokenStorageService } from '@features/authentication/infrastructure/storage/token-storage.service';

const CONTAINER_ID = 'a1b2c3d4e5f6';
const SCHEMA_FAILURE_MESSAGE = 'Runtime log stream message did not match the runtime log line schema';
const RUNTIME_URL = `${environment.apiBaseUrl}/logs/runtime`;
const STREAM_URL = `${RUNTIME_URL}/stream?containerId=${CONTAINER_ID}`;

const line: RuntimeLogLine = {
    timestamp: '2026-01-01T00:00:00.000Z',
    source: 'stdout',
    text: 'listening on port 3000',
};

const errorLine: RuntimeLogLine = {
    timestamp: '2026-01-01T00:00:01.000Z',
    source: 'stderr',
    text: 'connection refused',
};

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
 * Subscribes to `stream()` and resolves once the observable settles, returning the
 * lines seen plus how it terminated.
 */
function collectLines(
    repository: RuntimeLogsApiRepository,
    containerId: string,
): Promise<{ lines: RuntimeLogLine[]; completed?: boolean; error?: unknown }> {
    return new Promise((resolve) => {
        const lines: RuntimeLogLine[] = [];

        repository.stream(containerId).subscribe({
            next: (value) => lines.push(value),
            error: (error: unknown) => { resolve({ lines, error }); },
            complete: () => { resolve({ lines, completed: true }); },
        });
    });
}

/**
 * Yields to the microtask/macrotask queue so pending stream reads flush.
 */
function flush(): Promise<void> {
    return new Promise((resolve) => { setTimeout(resolve, 0); });
}

/**
 * Yields to the macrotask queue and flushes effects so resource signals settle.
 */
async function settle(): Promise<void> {
    await new Promise((resolve) => { setTimeout(resolve, 0); });
    TestBed.tick();
}

describe('RuntimeLogsApiRepository', () => {
    let repository: RuntimeLogsApiRepository;
    let httpMock: HttpTestingController;
    let tokenStorage: { accessToken: ReturnType<typeof signal<string | null>> };
    let fetchMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        tokenStorage = { accessToken: signal<string | null>(null) };
        fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);

        TestBed.configureTestingModule({
            providers: [
                RuntimeLogsApiRepository,
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: TokenStorageService, useValue: tokenStorage },
            ],
        });

        repository = TestBed.inject(RuntimeLogsApiRepository);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        httpMock.verify();
    });

    describe('runtimeLogs', () => {
        test('GETs the history of the container with the number of the lines the caller asks for', async () => {
            const resource = TestBed.runInInjectionContext(
                () => repository.runtimeLogs(() => CONTAINER_ID, () => 200),
            );
            TestBed.tick();

            const req = httpMock.expectOne(`${RUNTIME_URL}?containerId=${CONTAINER_ID}&tail=200`);
            expect(req.request.method).toBe('GET');

            req.flush([line, errorLine]);
            await settle();

            expect(resource.value()).toEqual([line, errorLine]);
        });

        test('reads the history again when the number of the lines changes', async () => {
            const tail = signal(100);
            TestBed.runInInjectionContext(() => repository.runtimeLogs(() => CONTAINER_ID, () => tail()));
            TestBed.tick();

            httpMock.expectOne(`${RUNTIME_URL}?containerId=${CONTAINER_ID}&tail=100`).flush([]);
            await settle();

            tail.set(500);
            TestBed.tick();

            const req = httpMock.expectOne(`${RUNTIME_URL}?containerId=${CONTAINER_ID}&tail=500`);
            expect(req.request.method).toBe('GET');
            req.flush([]);
            await settle();
        });

        test('issues no request while the container id is undefined', () => {
            const containerId = signal<string | undefined>(undefined);
            const resource = TestBed.runInInjectionContext(
                () => repository.runtimeLogs(() => containerId(), () => 200),
            );
            TestBed.tick();

            httpMock.expectNone(() => true);
            expect(resource.value()).toBeUndefined();
        });
    });

    describe('stream authorization headers', () => {
        test('sends the Bearer token and SSE Accept header when a token is present', async () => {
            tokenStorage.accessToken.set('token-1');
            fetchMock.mockReturnValue(Promise.resolve(streamResponse([])));

            await collectLines(repository, CONTAINER_ID);

            expect(fetchMock).toHaveBeenCalledTimes(1);

            const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
            expect(init.headers).toEqual({
                Accept: 'text/event-stream',
                Authorization: 'Bearer token-1',
            });
        });

        test('omits the Authorization header when the token is null', async () => {
            fetchMock.mockReturnValue(Promise.resolve(streamResponse([])));

            await collectLines(repository, CONTAINER_ID);

            const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
            expect(init.headers).toEqual({ Accept: 'text/event-stream' });
        });

        test('requests the configured stream URL for the container id', async () => {
            fetchMock.mockReturnValue(Promise.resolve(streamResponse([])));

            await collectLines(repository, CONTAINER_ID);

            const [calledUrl] = fetchMock.mock.calls[0] as [string, RequestInit];
            expect(calledUrl).toBe(STREAM_URL);
        });
    });

    describe('stream parsing', () => {
        test('emits one line per frame, joins multi-line data, and completes when the daemon closes', async () => {
            fetchMock.mockReturnValue(Promise.resolve(streamResponse([
                // Frame split across chunks to exercise buffering.
                `data: {"timestamp":"${line.timestamp}","source":"stdout","te`,
                `xt":"${line.text}"}\n\n`,
                // Multi-line data payload joined with a newline into valid JSON, on a CRLF boundary.
                `data: {"timestamp":"${errorLine.timestamp}",\ndata: "source":"stderr","text":"${errorLine.text}"}\r\n\r\n`,
            ])));

            const outcome = await collectLines(repository, CONTAINER_ID);

            expect(outcome.lines).toEqual([line, errorLine]);
            expect(outcome.completed).toBe(true);
            expect(outcome.error).toBeUndefined();
        });

        test('ignores non-data blocks such as comments and heartbeats', async () => {
            fetchMock.mockReturnValue(Promise.resolve(streamResponse([
                ': heartbeat\n\n',
                `data: ${JSON.stringify(line)}\n\n`,
            ])));

            const outcome = await collectLines(repository, CONTAINER_ID);

            expect(outcome.lines).toEqual([line]);
            expect(outcome.completed).toBe(true);
        });
    });

    describe('stream failures', () => {
        test('reports the failure when a message carries a source the schema refuses', async () => {
            fetchMock.mockReturnValue(Promise.resolve(streamResponse([
                `data: ${JSON.stringify(line)}\n\n`,
                `data: {"timestamp":"${line.timestamp}","source":"stdin","text":"kept out"}\n\n`,
            ])));

            const outcome = await collectLines(repository, CONTAINER_ID);

            expect(outcome.lines).toEqual([line]);
            expect(outcome.completed).toBeUndefined();
            expect((outcome.error as Error).message).toBe(SCHEMA_FAILURE_MESSAGE);
        });

        test('reports the failure when the payload of a message is no JSON', async () => {
            fetchMock.mockReturnValue(Promise.resolve(streamResponse(['data: not-json\n\n'])));

            const outcome = await collectLines(repository, CONTAINER_ID);

            expect(outcome.lines).toEqual([]);
            expect((outcome.error as Error).message).toBe(SCHEMA_FAILURE_MESSAGE);
        });

        test('errors when fetch resolves a non-OK response', async () => {
            fetchMock.mockReturnValue(Promise.resolve(streamResponse([], false, 503)));

            const outcome = await collectLines(repository, CONTAINER_ID);

            expect(outcome.lines).toEqual([]);
            expect(outcome.error).toBeInstanceOf(Error);
            expect((outcome.error as Error).message).toBe('Runtime log stream request failed with status 503');
        });
    });

    describe('stream teardown', () => {
        test('aborts the fetch on unsubscribe without emitting an error', async () => {
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
            const subscription = repository.stream(CONTAINER_ID).subscribe({ next: nextSpy, error: errorSpy });

            subscription.unsubscribe();
            await flush();

            expect(capturedSignal?.aborted).toBe(true);
            expect(errorSpy).not.toHaveBeenCalled();
            expect(nextSpy).not.toHaveBeenCalled();
        });
    });
});
