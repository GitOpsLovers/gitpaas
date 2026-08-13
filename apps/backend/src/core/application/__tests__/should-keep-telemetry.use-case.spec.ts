import type { TelemetryEvent } from '../../domain/models/telemetry.models';
import { shouldKeepTelemetryUseCase } from '../should-keep-telemetry.use-case';

/** Slow threshold, in milliseconds, the specs decide with. */
const SLOW_MS = 1000;

/** Sampled share of the ordinary reads the specs decide with. */
const SAMPLE_RATE = 0.05;

/** Draw that never falls inside the sampled share. */
const DROPPING_DRAW = 0.9;

/** Draw that always falls inside the sampled share. */
const KEEPING_DRAW = 0.01;

/** Builds a completed telemetry event, overriding only the fields under test. */
const buildEvent = (overrides: Partial<TelemetryEvent> = {}): TelemetryEvent => ({
    timestamp: '2026-01-01T00:00:00.000Z',
    'event.name': 'http.request',
    'service.name': 'gitpaas-backend',
    'service.version': 'unknown',
    'service.env': 'test',
    'host.name': 'host',
    'process.pid': 1,
    'trace.id': 'correlation-id',
    ...overrides,
});

/** Decides on an event with the shared thresholds and a controlled draw. */
const decide = (overrides: Partial<TelemetryEvent> = {}, randomValue = DROPPING_DRAW) =>
    shouldKeepTelemetryUseCase(buildEvent(overrides), SLOW_MS, SAMPLE_RATE, randomValue);

describe('shouldKeepTelemetryUseCase', () => {
    it('keeps a server failure', () => {
        expect(decide({ 'http.status_code': 500 })).toEqual({
            kept: true,
            reason: 'server_error',
            rate: 1,
        });
    });

    it('keeps an event carrying an error code', () => {
        expect(decide({ 'http.status_code': 404, 'error.code': 'PROJECT_NOT_FOUND' })).toEqual({
            kept: true,
            reason: 'error',
            rate: 1,
        });
    });

    it('reports a server failure carrying an error code as a server error', () => {
        expect(decide({ 'http.status_code': 500, 'error.code': 'DOCKER_UNREACHABLE' })).toEqual({
            kept: true,
            reason: 'server_error',
            rate: 1,
        });
    });

    it('never reports a client failure as a server error', () => {
        expect(
            decide({ 'http.method': 'GET', 'http.status_code': 499, 'http.duration_ms': 1 }),
        ).toEqual({ kept: false });
    });

    it('reports a failed mutation carrying an error code as an error', () => {
        expect(
            decide({ 'http.method': 'POST', 'http.status_code': 409, 'error.code': 'SERVICE_ALREADY_EXISTS' }),
        ).toEqual({ kept: true, reason: 'error', rate: 1 });
    });

    it('reports a write to the authentication feature as a mutation', () => {
        expect(
            decide({
                'http.method': 'POST',
                'http.route': '/api/v1/auth/login',
                'http.status_code': 200,
            }),
        ).toEqual({ kept: true, reason: 'mutation', rate: 1 });
    });

    it('keeps a mutation', () => {
        expect(decide({ 'http.method': 'POST', 'http.status_code': 201 })).toEqual({
            kept: true,
            reason: 'mutation',
            rate: 1,
        });
    });

    it('keeps an authentication request', () => {
        expect(
            decide({
                'http.method': 'GET',
                'http.route': '/api/v1/auth/me',
                'http.status_code': 200,
            }),
        ).toEqual({ kept: true, reason: 'auth', rate: 1 });
    });

    it('keeps a deployment run', () => {
        expect(decide({ 'event.name': 'deployment.run' })).toEqual({
            kept: true,
            reason: 'deployment',
            rate: 1,
        });
    });

    it('never drops a deployment run, whatever the draw', () => {
        expect(decide({ 'event.name': 'deployment.run' }, 1).kept).toBe(true);
    });

    it('keeps a long deployment run as a deployment and never as a slow request', () => {
        expect(decide({ 'event.name': 'deployment.run', 'http.duration_ms': 60_000 })).toEqual({
            kept: true,
            reason: 'deployment',
            rate: 1,
        });
    });

    it('keeps a stream', () => {
        expect(decide({ 'http.method': 'GET', 'http.sse': true })).toEqual({
            kept: true,
            reason: 'stream',
            rate: 1,
        });
    });

    it('keeps a long stream as a stream and never as a slow request', () => {
        expect(
            decide({ 'http.method': 'GET', 'http.sse': true, 'http.duration_ms': 60_000 }),
        ).toEqual({ kept: true, reason: 'stream', rate: 1 });
    });

    it('keeps a slow read', () => {
        expect(
            decide({ 'http.method': 'GET', 'http.status_code': 200, 'http.duration_ms': 1500 }),
        ).toEqual({ kept: true, reason: 'slow', rate: 1 });
    });

    it('never counts a request right on the threshold as slow', () => {
        expect(
            decide({ 'http.method': 'GET', 'http.status_code': 200, 'http.duration_ms': SLOW_MS }),
        ).toEqual({ kept: false });
    });

    it('drops a fast successful read the draw left outside the sampled share', () => {
        expect(
            decide({ 'http.method': 'GET', 'http.status_code': 200, 'http.duration_ms': 1 }),
        ).toEqual({ kept: false });
    });

    it('keeps a fast successful read the draw left inside the sampled share', () => {
        expect(
            decide(
                { 'http.method': 'GET', 'http.status_code': 200, 'http.duration_ms': 1 },
                KEEPING_DRAW,
            ),
        ).toEqual({ kept: true, reason: 'random', rate: SAMPLE_RATE });
    });

    it('drops a fast successful read the draw left right on the sampled share', () => {
        expect(
            decide(
                { 'http.method': 'GET', 'http.status_code': 200, 'http.duration_ms': 1 },
                SAMPLE_RATE,
            ),
        ).toEqual({ kept: false });
    });

    it('drops every ordinary read once the sampled share is zero', () => {
        expect(
            shouldKeepTelemetryUseCase(
                buildEvent({ 'http.method': 'GET', 'http.status_code': 200, 'http.duration_ms': 1 }),
                SLOW_MS,
                0,
                0,
            ),
        ).toEqual({ kept: false });
    });

    it('keeps every ordinary read once the sampled share is full', () => {
        expect(
            shouldKeepTelemetryUseCase(
                buildEvent({ 'http.method': 'GET', 'http.status_code': 200, 'http.duration_ms': 1 }),
                SLOW_MS,
                1,
                0.999,
            ),
        ).toEqual({ kept: true, reason: 'random', rate: 1 });
    });

    it('drops a high-frequency health probe', () => {
        expect(
            decide({
                'http.method': 'GET',
                'http.route': '/api/v1/server/health',
                'http.status_code': 200,
                'http.duration_ms': 0.4,
            }),
        ).toEqual({ kept: false });
    });

    it('reports the failure of a mutation as a server error', () => {
        expect(decide({ 'http.method': 'POST', 'http.status_code': 503 })).toEqual({
            kept: true,
            reason: 'server_error',
            rate: 1,
        });
    });

    it('never mutates the event it receives', () => {
        const event = buildEvent({ 'http.status_code': 200 });

        shouldKeepTelemetryUseCase(event, SLOW_MS, SAMPLE_RATE, KEEPING_DRAW);

        expect(event).toEqual(buildEvent({ 'http.status_code': 200 }));
    });
});
