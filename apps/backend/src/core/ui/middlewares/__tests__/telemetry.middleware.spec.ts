// eslint-disable-next-line import/no-unassigned-import
import 'reflect-metadata';

import { EventEmitter } from 'node:events';

import { INJECTABLE_WATERMARK, SELF_DECLARED_DEPS_METADATA } from '@nestjs/common/constants';
import { ConfigService } from '@nestjs/config';

// eslint-disable-next-line @typescript-eslint/no-redeclare
import type { NextFunction, Request, Response } from 'express';

import { shouldKeepTelemetryUseCase } from '../../../application/should-keep-telemetry.use-case';
import type { TelemetryEvent } from '../../../domain/models/telemetry.models';
import type { TelemetryWriter } from '../../../domain/ports/telemetry-writer.port';
import { StdoutTelemetryWriterAdapter } from '../../../infrastructure/telemetry/stdout-telemetry-writer.adapter';
import { enrichTelemetry } from '../../../infrastructure/telemetry/telemetry.context';
import { REQUEST_ID_HEADER } from '../request-id.middleware';
import { TelemetryMiddleware } from '../telemetry.middleware';

jest.mock('../../../application/should-keep-telemetry.use-case');

const mockShouldKeepTelemetry = shouldKeepTelemetryUseCase as jest.MockedFunction<
    typeof shouldKeepTelemetryUseCase
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
 * Builds the configuration double serving the sampling settings.
 */
function buildConfig(slowMs = 1000, sampleRate = 0.05): ConfigService {
    const values: Record<string, number> = {
        TELEMETRY_SLOW_MS: slowMs,
        TELEMETRY_SAMPLE_RATE: sampleRate,
    };

    // eslint-disable-next-line security/detect-object-injection
    return { get: jest.fn((key: string) => values[key]) } as unknown as ConfigService;
}

/**
 * Builds the middleware over a writer stub recording the events it receives.
 */
function buildWriter() {
    const emitted: TelemetryEvent[] = [];

    const writer: TelemetryWriter = {
        emit: (event) => {
            emitted.push(event);
        },
    };

    return { emitted, middleware: new TelemetryMiddleware(writer, buildConfig()) };
}

describe('TelemetryMiddleware', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockShouldKeepTelemetry.mockReturnValue({ kept: true, reason: 'mutation', rate: 1 });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('continues the chain without emitting anything yet', () => {
        const { emitted, middleware } = buildWriter();
        const { request, response, next } = buildContext();

        middleware.use(request, response as unknown as Response, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(emitted).toHaveLength(0);
    });

    it('emits the service, correlation and request fields when the response finishes', () => {
        const { emitted, middleware } = buildWriter();
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
        const { emitted, middleware } = buildWriter();
        const { request, response, next } = buildContext({
            route: { path: '/api/v1/projects/:id' },
        } as unknown as Partial<Request>);

        middleware.use(request, response as unknown as Response, next);

        response.emit('finish');

        expect(emitted[0]['http.route']).toBe('/api/v1/projects/:id');
    });

    it('keeps the fields the layers added during the request', () => {
        const { emitted, middleware } = buildWriter();
        const { request, response } = buildContext();
        // The rest of the chain runs inside the scope, so its enrichment reaches the event
        const next = jest.fn(() => enrichTelemetry({ 'project.id': 'project-1' })) as unknown as NextFunction;

        middleware.use(request, response as unknown as Response, next);

        response.emit('finish');

        expect(emitted[0]['project.id']).toBe('project-1');
    });

    it('flags the log stream responses', () => {
        const { emitted, middleware } = buildWriter();
        const { request, response, next } = buildContext();

        middleware.use(request, response as unknown as Response, next);

        response.setContentType('text/event-stream');
        response.emit('finish');

        expect(emitted[0]['http.sse']).toBe(true);
    });

    it('flags a client abort when the response closes unfinished', () => {
        const { emitted, middleware } = buildWriter();
        const { request, response, next } = buildContext();

        middleware.use(request, response as unknown as Response, next);

        response.emit('close');

        expect(emitted).toHaveLength(1);
        expect(emitted[0]['http.client_aborted']).toBe(true);
    });

    it('emits one event only when finish and close both fire', () => {
        const { emitted, middleware } = buildWriter();
        const { request, response, next } = buildContext();

        middleware.use(request, response as unknown as Response, next);

        response.writableEnded = true;
        response.emit('finish');
        response.emit('close');

        expect(emitted).toHaveLength(1);
        expect(emitted[0]['http.client_aborted']).toBe(false);
    });

    it('emits one event only when close fires before finish', () => {
        const { emitted, middleware } = buildWriter();
        const { request, response, next } = buildContext();

        middleware.use(request, response as unknown as Response, next);

        response.emit('close');
        response.writableEnded = true;
        response.emit('finish');

        expect(emitted).toHaveLength(1);
        expect(emitted[0]['http.client_aborted']).toBe(true);
    });

    it('emits one event only when close fires twice', () => {
        const { emitted, middleware } = buildWriter();
        const { request, response, next } = buildContext();

        middleware.use(request, response as unknown as Response, next);

        response.emit('close');
        response.emit('close');

        expect(emitted).toHaveLength(1);
    });

    it('never flags an abort when the response closes after being fully written', () => {
        const { emitted, middleware } = buildWriter();
        const { request, response, next } = buildContext();

        middleware.use(request, response as unknown as Response, next);

        response.writableEnded = true;
        response.emit('close');

        expect(emitted[0]['http.client_aborted']).toBe(false);
    });

    it('records the status the client abort left on the response', () => {
        const { emitted, middleware } = buildWriter();
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
        const { emitted, middleware } = buildWriter();
        const { request, response, next } = buildContext({ headers: {} } as unknown as Partial<Request>);

        middleware.use(request, response as unknown as Response, next);

        response.emit('finish');

        expect(emitted[0]['trace.id']).toMatch(UUID_PATTERN);
        expect(emitted[0]['request.id']).toBe(emitted[0]['trace.id']);
    });

    it('reports no query keys when the request has no query', () => {
        const { emitted, middleware } = buildWriter();
        const { request, response, next } = buildContext({ query: undefined } as unknown as Partial<Request>);

        middleware.use(request, response as unknown as Response, next);

        response.emit('finish');

        expect(emitted[0]['http.query_keys']).toEqual([]);
    });

    it('keeps an enrichment made after an asynchronous boundary inside the scope', async () => {
        const { emitted, middleware } = buildWriter();
        const { request, response } = buildContext();
        const next = jest.fn(() => {
            void Promise.resolve().then(() => enrichTelemetry({ 'user.id': 'user-1' }));
        }) as unknown as NextFunction;

        middleware.use(request, response as unknown as Response, next);

        await flush();
        response.emit('finish');

        expect(emitted[0]['user.id']).toBe('user-1');
    });

    it('keeps every field several layers enriched during the request', () => {
        const { emitted, middleware } = buildWriter();
        const { request, response } = buildContext();
        const next = jest.fn(() => {
            enrichTelemetry({ 'auth.outcome': 'authenticated', 'user.id': 'user-1' });
            enrichTelemetry({ 'project.id': 'project-1' });
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
        const { emitted, middleware } = buildWriter();
        const { request, response } = buildContext();
        const next = jest.fn(() => enrichTelemetry({ 'trace.id': 'overridden' })) as unknown as NextFunction;

        middleware.use(request, response as unknown as Response, next);

        response.emit('finish');

        expect(emitted[0]['trace.id']).toBe('overridden');
    });

    it('lets the outcome of the response win over an enriched status code', () => {
        const { emitted, middleware } = buildWriter();
        const { request, response } = buildContext();
        const next = jest.fn(() => enrichTelemetry({ 'http.status_code': 200 })) as unknown as NextFunction;

        middleware.use(request, response as unknown as Response, next);

        response.statusCode = 500;
        response.emit('finish');

        expect(emitted[0]['http.status_code']).toBe(500);
    });

    it('never reaches an enrichment that lost the scope', () => {
        const { emitted, middleware } = buildWriter();
        const { request, response, next } = buildContext();

        middleware.use(request, response as unknown as Response, next);

        enrichTelemetry({ 'project.id': 'project-1' });
        response.emit('finish');

        expect(Object.keys(emitted[0])).not.toContain('project.id');
    });

    it('measures a non-negative duration', () => {
        const { emitted, middleware } = buildWriter();
        const { request, response, next } = buildContext();

        middleware.use(request, response as unknown as Response, next);

        response.emit('finish');

        expect(emitted[0]['http.duration_ms']).toBeGreaterThanOrEqual(0);
    });

    it('asks the sampler about the completed event', () => {
        const { middleware } = buildWriter();

        const { request, response, next } = buildContext();

        middleware.use(request, response as unknown as Response, next);

        response.statusCode = 204;
        response.emit('finish');

        expect(mockShouldKeepTelemetry).toHaveBeenCalledTimes(1);
        expect(mockShouldKeepTelemetry).toHaveBeenCalledWith(
            expect.objectContaining({ 'http.status_code': 204 }),
            1000,
            0.05,
            expect.any(Number),
        );
    });

    it('asks the sampler with the thresholds the configuration holds', () => {
        const middleware = new TelemetryMiddleware({ emit: jest.fn() }, buildConfig(2500, 0.5));
        const { request, response, next } = buildContext();

        middleware.use(request, response as unknown as Response, next);

        response.emit('finish');

        expect(mockShouldKeepTelemetry).toHaveBeenCalledWith(
            expect.any(Object),
            2500,
            0.5,
            expect.any(Number),
        );
    });

    it('falls back to the default thresholds when the configuration holds none', () => {
        // A ConfigService returning its own fallback stands for an absent variable
        const config = {
            get: jest.fn((_key: string, fallback: number) => fallback),
        } as unknown as ConfigService;
        const middleware = new TelemetryMiddleware({ emit: jest.fn() }, config);
        const { request, response, next } = buildContext();

        middleware.use(request, response as unknown as Response, next);

        response.emit('finish');

        expect(mockShouldKeepTelemetry).toHaveBeenCalledWith(
            expect.any(Object),
            1000,
            0.05,
            expect.any(Number),
        );
    });

    it('decides the sampled keep with a fresh random draw', () => {
        jest.spyOn(Math, 'random').mockReturnValue(0.42);

        const { middleware } = buildWriter();
        const { request, response, next } = buildContext();

        middleware.use(request, response as unknown as Response, next);

        response.emit('finish');

        expect(mockShouldKeepTelemetry).toHaveBeenCalledWith(
            expect.any(Object),
            1000,
            0.05,
            0.42,
        );
    });

    it('records the sampling decision on the event it emits', () => {
        mockShouldKeepTelemetry.mockReturnValue({ kept: true, reason: 'random', rate: 0.05 });

        const { emitted, middleware } = buildWriter();
        const { request, response, next } = buildContext();

        middleware.use(request, response as unknown as Response, next);

        response.emit('finish');

        expect(emitted[0]['sampling.kept_reason']).toBe('random');
        expect(emitted[0]['sampling.rate']).toBe(0.05);
    });

    it('never emits an event the sampler dropped', () => {
        mockShouldKeepTelemetry.mockReturnValue({ kept: false });

        const { emitted, middleware } = buildWriter();
        const { request, response, next } = buildContext();

        middleware.use(request, response as unknown as Response, next);

        response.emit('finish');

        expect(emitted).toHaveLength(0);
    });

    it('emits to the writer it was injected with, and to no other', () => {
        const mockWriter: jest.Mocked<TelemetryWriter> = { emit: jest.fn() };
        const mockOtherWriter: jest.Mocked<TelemetryWriter> = { emit: jest.fn() };
        const middleware = new TelemetryMiddleware(mockWriter, buildConfig());
        const { request, response, next } = buildContext();

        middleware.use(request, response as unknown as Response, next);

        response.statusCode = 201;
        response.emit('finish');

        expect(mockWriter.emit).toHaveBeenCalledTimes(1);
        expect(mockWriter.emit).toHaveBeenCalledWith(expect.objectContaining({ 'http.status_code': 201 }));
        expect(mockOtherWriter.emit).not.toHaveBeenCalled();
    });

    it('never writes to the writer of another instance of the middleware', () => {
        const mockWriter: jest.Mocked<TelemetryWriter> = { emit: jest.fn() };
        const mockIdleWriter: jest.Mocked<TelemetryWriter> = { emit: jest.fn() };
        const middleware = new TelemetryMiddleware(mockWriter, buildConfig());
        const idleMiddleware = new TelemetryMiddleware(mockIdleWriter, buildConfig());
        const { request, response, next } = buildContext();

        middleware.use(request, response as unknown as Response, next);

        response.emit('finish');

        expect(idleMiddleware).toBeInstanceOf(TelemetryMiddleware);
        expect(mockWriter.emit).toHaveBeenCalledTimes(1);
        expect(mockIdleWriter.emit).not.toHaveBeenCalled();
    });

    it('declares the stdout writer adapter as the injection token of its writer parameter', () => {
        const injected = Reflect.getMetadata(SELF_DECLARED_DEPS_METADATA, TelemetryMiddleware) as
            | { index: number; param: unknown }[]
            | undefined;

        expect(injected).toEqual([{ index: 0, param: StdoutTelemetryWriterAdapter }]);
    });

    it('is marked injectable, so the container can build it as a provider', () => {
        expect(Reflect.getMetadata(INJECTABLE_WATERMARK, TelemetryMiddleware)).toBe(true);
    });
});
