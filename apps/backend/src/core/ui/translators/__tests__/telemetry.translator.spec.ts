import { hostname } from 'node:os';

// eslint-disable-next-line @typescript-eslint/no-redeclare
import type { Request } from 'express';

import { REQUEST_ID_HEADER } from '../../middlewares/request-id.middleware';
import { buildTelemetrySeed, resolveRoute } from '../telemetry.translator';

/**
 * Builds the request the translator maps into the telemetry event of a request.
 */
function buildRequest(overrides: Partial<Request> = {}): Request {
    return {
        method: 'GET',
        path: '/api/v1/projects/42',
        baseUrl: '',
        query: {},
        headers: { [REQUEST_ID_HEADER]: 'correlation-id' },
        ...overrides,
    } as unknown as Request;
}

describe('resolveRoute', () => {
    it('omits http.route when no route matched the request', () => {
        const request = buildRequest();

        expect(resolveRoute(request)).toBeUndefined();
    });

    it('omits http.route when the matched route carries no string path', () => {
        const request = buildRequest({ route: {} } as unknown as Partial<Request>);

        expect(resolveRoute(request)).toBeUndefined();
    });

    it('prefixes the matched route with the mount path of its router', () => {
        const request = buildRequest({
            baseUrl: '/api/v1/projects',
            route: { path: '/:id' },
        } as unknown as Partial<Request>);

        expect(resolveRoute(request)).toBe('/api/v1/projects/:id');
    });
});

describe('buildTelemetrySeed', () => {
    let envBackup: NodeJS.ProcessEnv;

    beforeEach(() => {
        envBackup = { ...process.env };
    });

    afterEach(() => {
        process.env = envBackup;
    });

    it('stamps the event name and the service every telemetry event is attributed to', () => {
        const seed = buildTelemetrySeed(buildRequest());

        expect(seed['event.name']).toBe('http.request');
        expect(seed['service.name']).toBe('gitpaas-backend');
    });

    it('reports the build version the process was stamped with', () => {
        process.env.APP_VERSION = '1.4.2';

        expect(buildTelemetrySeed(buildRequest())['service.version']).toBe('1.4.2');
    });

    it('falls back to the unknown version when no build stamped one', () => {
        delete process.env.APP_VERSION;

        expect(buildTelemetrySeed(buildRequest())['service.version']).toBe('unknown');
    });

    it('reports the environment the process runs in', () => {
        process.env.NODE_ENV = 'production';

        expect(buildTelemetrySeed(buildRequest())['service.env']).toBe('production');
    });

    it('falls back to development when the environment is not set', () => {
        delete process.env.NODE_ENV;

        expect(buildTelemetrySeed(buildRequest())['service.env']).toBe('development');
    });

    it('stamps the host and the process the event was produced on', () => {
        const seed = buildTelemetrySeed(buildRequest());

        expect(seed['host.name']).toBe(hostname());
        expect(seed['process.pid']).toBe(process.pid);
    });

    it('correlates the trace with the request id of the incoming request', () => {
        const seed = buildTelemetrySeed(buildRequest());

        expect(seed['request.id']).toBe('correlation-id');
        expect(seed['trace.id']).toBe(seed['request.id']);
    });

    it('omits the optional request fields when their headers are absent', () => {
        const seed = buildTelemetrySeed(buildRequest());

        const keys = Object.keys(seed);

        expect(keys).not.toContain('http.user_agent');
        expect(keys).not.toContain('http.request_bytes');
    });

    it('omits http.user_agent when the header carries an empty value', () => {
        const request = buildRequest({
            headers: { [REQUEST_ID_HEADER]: 'correlation-id', 'user-agent': '' },
        } as unknown as Partial<Request>);

        expect(Object.keys(buildTelemetrySeed(request))).not.toContain('http.user_agent');
    });

    it('reports the declared body size as a number', () => {
        const request = buildRequest({
            headers: { [REQUEST_ID_HEADER]: 'correlation-id', 'content-length': '128' },
        } as unknown as Partial<Request>);

        expect(buildTelemetrySeed(request)['http.request_bytes']).toBe(128);
    });

    it('omits http.request_bytes when the content length is not a number', () => {
        const request = buildRequest({
            headers: { [REQUEST_ID_HEADER]: 'correlation-id', 'content-length': 'many' },
        } as unknown as Partial<Request>);

        const seed = buildTelemetrySeed(request);

        expect(Object.keys(seed)).not.toContain('http.request_bytes');
    });

    it('keeps the first value of a repeated user agent header', () => {
        const request = buildRequest({
            headers: { [REQUEST_ID_HEADER]: 'correlation-id', 'user-agent': ['jest', 'curl'] },
        } as unknown as Partial<Request>);

        expect(buildTelemetrySeed(request)['http.user_agent']).toBe('jest');
    });
});
