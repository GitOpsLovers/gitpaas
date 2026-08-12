// eslint-disable-next-line import/no-unassigned-import
import 'reflect-metadata';

import { EventEmitter } from 'node:events';

import { INJECTABLE_WATERMARK, SELF_DECLARED_DEPS_METADATA } from '@nestjs/common/constants';

// eslint-disable-next-line @typescript-eslint/no-redeclare
import type { NextFunction, Request, Response } from 'express';

import { shouldKeepWideEventUseCase } from '../../../application/should-keep-wide-event.use-case';
import type { WideEvent } from '../../../domain/models/wide-event.models';
import type { WideEventSink } from '../../../domain/ports/wide-event-sink.port';
import { StdoutWideEventSinkAdapter } from '../../../infrastructure/observability/stdout-wide-event-sink.adapter';
import { enrichWideEvent } from '../../../infrastructure/observability/wide-event.context';
import { REQUEST_ID_HEADER } from '../request-id.middleware';
import { WideEventMiddleware } from '../wide-event.middleware';

jest.mock('../../../application/should-keep-wide-event.use-case');

const mockShouldKeepWideEvent = shouldKeepWideEventUseCase as jest.MockedFunction<
    typeof shouldKeepWideEventUseCase
>;

/** RFC 4122 shape of a generated correlation id. */
const UUID_PATTERN = /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/;

/** Resolves after pending microtasks, letting an asynchronous enrichment settle. */
const flush = (): Promise<void> =>
    new Promise<void>((resolve) => {
        setImmediate(resolve);
    });

/**
 * Response double exposing the event emitter the middleware hooks into.
 */
class FakeResponse extends EventEmitter {
    public statusCode = 200;

    public writableEnded = false;

    private readonly headers: Record<string, string> = {};

    public setContentType(value: string): void {
        this.headers['content-type'] = value;
    }

    public getHeader(name: string): string | undefined {
        // eslint-disable-next-line security/detect-object-injection
        return this.headers[name];
    }
}

/**
 * Builds the request/response/next trio the middleware works with.
 */
function buildContext(overrides: Partial<Request> = {}) {
    const request = {
        method: 'GET',
        path: '/api/v1/projects/42',
        baseUrl: '',
        query: {},
        headers: { [REQUEST_ID_HEADER]: 'correlation-id' },
        ...overrides,
    } as unknown as Request;
    const response = new FakeResponse();
    const next = jest.fn() as unknown as NextFunction;

    return { request, response, next };
}

/**
 * Builds the middleware over a sink stub recording the events it receives.
 */
function buildSink() {
    const emitted: WideEvent[] = [];

    const sink: WideEventSink = {
        emit: (event) => {
            emitted.push(event);
        },
    };

    return { emitted, middleware: new WideEventMiddleware(sink) };
}

describe('WideEventMiddleware', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockShouldKeepWideEvent.mockReturnValue(true);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('continues the chain without emitting anything yet', () => {
        const { emitted, middleware } = buildSink();
        const { request, response, next } = buildContext();

        middleware.use(request, response as unknown as Response, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(emitted).toHaveLength(0);
    });

    it('emits the service, correlation and request fields when the response finishes', () => {
        const { emitted, middleware } = buildSink();
        const { request, response, next } = buildContext({
            method: 'POST',
            query: { page: '2', size: '10' },
            headers: {
                [REQUEST_ID_HEADER]: 'correlation-id',
                'user-agent': 'jest',
                'content-length': '128',
            },
        } as unknown as Partial<Request>);

        middleware.use(request, response as unknown as Response, next);

        response.statusCode = 201;
        response.writableEnded = true;
        response.emit('finish');

        expect(emitted).toHaveLength(1);

        const [event] = emitted;

        expect(event['event.name']).toBe('http.request');
        expect(event['service.name']).toBe('gitpaas-backend');
        expect(event['host.name']).toEqual(expect.any(String));
        expect(event['process.pid']).toBe(process.pid);
        expect(event['trace.id']).toBe('correlation-id');
        expect(event['request.id']).toBe('correlation-id');
        expect(event['http.method']).toBe('POST');
        expect(event['http.path']).toBe('/api/v1/projects/42');
        expect(event['http.query_keys']).toEqual(['page', 'size']);
        expect(event['http.status_code']).toBe(201);
        expect(event['http.duration_ms']).toEqual(expect.any(Number));
        expect(event['http.request_bytes']).toBe(128);
        expect(event['http.user_agent']).toBe('jest');
        expect(event['http.sse']).toBe(false);
        expect(event['http.client_aborted']).toBe(false);
        expect(event.timestamp).toEqual(expect.any(String));
    });

    it('adds the matched route pattern', () => {
        const { emitted, middleware } = buildSink();
        const { request, response, next } = buildContext({
            route: { path: '/api/v1/projects/:id' },
        } as unknown as Partial<Request>);

        middleware.use(request, response as unknown as Response, next);

        response.emit('finish');

        expect(emitted[0]['http.route']).toBe('/api/v1/projects/:id');
    });

    it('keeps the fields the layers added during the request', () => {
        const { emitted, middleware } = buildSink();
        const { request, response } = buildContext();
        // The rest of the chain runs inside the scope, so its enrichment reaches the event
        const next = jest.fn(() => enrichWideEvent({ 'project.id': 'project-1' })) as unknown as NextFunction;

        middleware.use(request, response as unknown as Response, next);

        response.emit('finish');

        expect(emitted[0]['project.id']).toBe('project-1');
    });

    it('flags the log stream responses', () => {
        const { emitted, middleware } = buildSink();
        const { request, response, next } = buildContext();

        middleware.use(request, response as unknown as Response, next);

        response.setContentType('text/event-stream');
        response.emit('finish');

        expect(emitted[0]['http.sse']).toBe(true);
    });

    it('flags a client abort when the response closes unfinished', () => {
        const { emitted, middleware } = buildSink();
        const { request, response, next } = buildContext();

        middleware.use(request, response as unknown as Response, next);

        response.emit('close');

        expect(emitted).toHaveLength(1);
        expect(emitted[0]['http.client_aborted']).toBe(true);
    });

    it('emits one event only when finish and close both fire', () => {
        const { emitted, middleware } = buildSink();
        const { request, response, next } = buildContext();

        middleware.use(request, response as unknown as Response, next);

        response.writableEnded = true;
        response.emit('finish');
        response.emit('close');

        expect(emitted).toHaveLength(1);
        expect(emitted[0]['http.client_aborted']).toBe(false);
    });

    it('emits one event only when close fires before finish', () => {
        const { emitted, middleware } = buildSink();
        const { request, response, next } = buildContext();

        middleware.use(request, response as unknown as Response, next);

        response.emit('close');
        response.writableEnded = true;
        response.emit('finish');

        expect(emitted).toHaveLength(1);
        expect(emitted[0]['http.client_aborted']).toBe(true);
    });

    it('emits one event only when close fires twice', () => {
        const { emitted, middleware } = buildSink();
        const { request, response, next } = buildContext();

        middleware.use(request, response as unknown as Response, next);

        response.emit('close');
        response.emit('close');

        expect(emitted).toHaveLength(1);
    });

    it('never flags an abort when the response closes after being fully written', () => {
        const { emitted, middleware } = buildSink();
        const { request, response, next } = buildContext();

        middleware.use(request, response as unknown as Response, next);

        response.writableEnded = true;
        response.emit('close');

        expect(emitted[0]['http.client_aborted']).toBe(false);
    });

    it('records the status the client abort left on the response', () => {
        const { emitted, middleware } = buildSink();
        const { request, response, next } = buildContext();

        middleware.use(request, response as unknown as Response, next);

        response.statusCode = 200;
        response.setContentType('text/event-stream');
        response.emit('close');

        expect(emitted[0]).toEqual(
            expect.objectContaining({
                'http.status_code': 200,
                'http.sse': true,
                'http.client_aborted': true,
            }),
        );
    });

    it('generates the correlation id when the request carries none', () => {
        const { emitted, middleware } = buildSink();
        const { request, response, next } = buildContext({ headers: {} } as unknown as Partial<Request>);

        middleware.use(request, response as unknown as Response, next);

        response.emit('finish');

        expect(emitted[0]['trace.id']).toMatch(UUID_PATTERN);
        expect(emitted[0]['request.id']).toBe(emitted[0]['trace.id']);
    });

    it('reports no query keys when the request has no query', () => {
        const { emitted, middleware } = buildSink();
        const { request, response, next } = buildContext({ query: undefined } as unknown as Partial<Request>);

        middleware.use(request, response as unknown as Response, next);

        response.emit('finish');

        expect(emitted[0]['http.query_keys']).toEqual([]);
    });

    it('keeps an enrichment made after an asynchronous boundary inside the scope', async () => {
        const { emitted, middleware } = buildSink();
        const { request, response } = buildContext();
        const next = jest.fn(() => {
            void Promise.resolve().then(() => enrichWideEvent({ 'user.id': 'user-1' }));
        }) as unknown as NextFunction;

        middleware.use(request, response as unknown as Response, next);

        await flush();
        response.emit('finish');

        expect(emitted[0]['user.id']).toBe('user-1');
    });

    it('keeps every field several layers enriched during the request', () => {
        const { emitted, middleware } = buildSink();
        const { request, response } = buildContext();
        const next = jest.fn(() => {
            enrichWideEvent({ 'auth.outcome': 'authenticated', 'user.id': 'user-1' });
            enrichWideEvent({ 'project.id': 'project-1' });
        }) as unknown as NextFunction;

        middleware.use(request, response as unknown as Response, next);

        response.emit('finish');

        expect(emitted[0]).toEqual(
            expect.objectContaining({
                'auth.outcome': 'authenticated',
                'user.id': 'user-1',
                'project.id': 'project-1',
            }),
        );
    });

    it('lets an enrichment override a seeded field', () => {
        const { emitted, middleware } = buildSink();
        const { request, response } = buildContext();
        const next = jest.fn(() => enrichWideEvent({ 'trace.id': 'overridden' })) as unknown as NextFunction;

        middleware.use(request, response as unknown as Response, next);

        response.emit('finish');

        expect(emitted[0]['trace.id']).toBe('overridden');
    });

    it('lets the outcome of the response win over an enriched status code', () => {
        const { emitted, middleware } = buildSink();
        const { request, response } = buildContext();
        const next = jest.fn(() => enrichWideEvent({ 'http.status_code': 200 })) as unknown as NextFunction;

        middleware.use(request, response as unknown as Response, next);

        response.statusCode = 500;
        response.emit('finish');

        expect(emitted[0]['http.status_code']).toBe(500);
    });

    it('never reaches an enrichment that lost the scope', () => {
        const { emitted, middleware } = buildSink();
        const { request, response, next } = buildContext();

        middleware.use(request, response as unknown as Response, next);

        enrichWideEvent({ 'project.id': 'project-1' });
        response.emit('finish');

        expect(Object.keys(emitted[0])).not.toContain('project.id');
    });

    it('measures a non-negative duration', () => {
        const { emitted, middleware } = buildSink();
        const { request, response, next } = buildContext();

        middleware.use(request, response as unknown as Response, next);

        response.emit('finish');

        expect(emitted[0]['http.duration_ms']).toBeGreaterThanOrEqual(0);
    });

    it('asks the sampler about the completed event', () => {
        const { middleware } = buildSink();

        const { request, response, next } = buildContext();

        middleware.use(request, response as unknown as Response, next);

        response.statusCode = 204;
        response.emit('finish');

        expect(mockShouldKeepWideEvent).toHaveBeenCalledTimes(1);
        expect(mockShouldKeepWideEvent).toHaveBeenCalledWith(
            expect.objectContaining({ 'http.status_code': 204 }),
        );
    });

    it('never emits an event the sampler dropped', () => {
        mockShouldKeepWideEvent.mockReturnValue(false);

        const { emitted, middleware } = buildSink();
        const { request, response, next } = buildContext();

        middleware.use(request, response as unknown as Response, next);

        response.emit('finish');

        expect(emitted).toHaveLength(0);
    });

    it('emits to the sink it was injected with, and to no other', () => {
        const mockSink: jest.Mocked<WideEventSink> = { emit: jest.fn() };
        const mockOtherSink: jest.Mocked<WideEventSink> = { emit: jest.fn() };
        const middleware = new WideEventMiddleware(mockSink);
        const { request, response, next } = buildContext();

        middleware.use(request, response as unknown as Response, next);

        response.statusCode = 201;
        response.emit('finish');

        expect(mockSink.emit).toHaveBeenCalledTimes(1);
        expect(mockSink.emit).toHaveBeenCalledWith(expect.objectContaining({ 'http.status_code': 201 }));
        expect(mockOtherSink.emit).not.toHaveBeenCalled();
    });

    it('never writes to the sink of another instance of the middleware', () => {
        const mockSink: jest.Mocked<WideEventSink> = { emit: jest.fn() };
        const mockIdleSink: jest.Mocked<WideEventSink> = { emit: jest.fn() };
        const middleware = new WideEventMiddleware(mockSink);
        const idleMiddleware = new WideEventMiddleware(mockIdleSink);
        const { request, response, next } = buildContext();

        middleware.use(request, response as unknown as Response, next);

        response.emit('finish');

        expect(idleMiddleware).toBeInstanceOf(WideEventMiddleware);
        expect(mockSink.emit).toHaveBeenCalledTimes(1);
        expect(mockIdleSink.emit).not.toHaveBeenCalled();
    });

    it('declares the stdout sink adapter as the injection token of its only constructor parameter', () => {
        const injected = Reflect.getMetadata(SELF_DECLARED_DEPS_METADATA, WideEventMiddleware) as
            | { index: number; param: unknown }[]
            | undefined;

        expect(injected).toEqual([{ index: 0, param: StdoutWideEventSinkAdapter }]);
    });

    it('is marked injectable, so the container can build it as a provider', () => {
        expect(Reflect.getMetadata(INJECTABLE_WATERMARK, WideEventMiddleware)).toBe(true);
    });
});
