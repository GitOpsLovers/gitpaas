import type { TelemetryEvent } from '../../domain/models/telemetry.models';
import { shouldKeepTelemetryUseCase } from '../should-keep-telemetry.use-case';

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

describe('shouldKeepTelemetryUseCase', () => {
    it('keeps a successful read', () => {
        expect(shouldKeepTelemetryUseCase(buildEvent({ 'http.status_code': 200 }))).toBe(true);
    });

    it('keeps a failed request', () => {
        expect(shouldKeepTelemetryUseCase(buildEvent({ 'http.status_code': 500 }))).toBe(true);
    });

    it('keeps a deployment run', () => {
        expect(shouldKeepTelemetryUseCase(buildEvent({ 'event.name': 'deployment.run' }))).toBe(
            true,
        );
    });

    it('keeps a client-aborted stream', () => {
        expect(
            shouldKeepTelemetryUseCase(
                buildEvent({ 'http.sse': true, 'http.client_aborted': true }),
            ),
        ).toBe(true);
    });

    it('keeps a fast successful read, as no sampling rule is implemented yet', () => {
        expect(
            shouldKeepTelemetryUseCase(
                buildEvent({ 'http.method': 'GET', 'http.status_code': 200, 'http.duration_ms': 1 }),
            ),
        ).toBe(true);
    });

    it('keeps an event carrying no outcome at all', () => {
        expect(shouldKeepTelemetryUseCase(buildEvent())).toBe(true);
    });

    it('keeps a high-frequency health probe, as no sampling rule is implemented yet', () => {
        expect(
            shouldKeepTelemetryUseCase(
                buildEvent({
                    'http.method': 'GET',
                    'http.route': '/api/v1/server/health',
                    'http.status_code': 200,
                    'http.duration_ms': 0.4,
                }),
            ),
        ).toBe(true);
    });

    it('never mutates the event it receives', () => {
        const event = buildEvent({ 'http.status_code': 200 });

        shouldKeepTelemetryUseCase(event);

        expect(event).toEqual(buildEvent({ 'http.status_code': 200 }));
    });
});
