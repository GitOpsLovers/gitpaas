import type { TelemetryEvent } from '../../../domain/models/telemetry.models';
import { StdoutTelemetryWriterAdapter } from '../stdout-telemetry-writer.adapter';

/**
 * Minimal completed event the writer publishes.
 */
const EVENT: TelemetryEvent = {
    timestamp: '2026-01-01T00:00:00.000Z',
    'event.name': 'http.request',
    'service.name': 'gitpaas-backend',
    'service.version': 'unknown',
    'service.env': 'test',
    'host.name': 'host',
    'process.pid': 1,
    'trace.id': 'correlation-id',
};

describe('StdoutTelemetryWriterAdapter', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('writes one JSON line per event', () => {
        const mockWrite = jest.spyOn(process.stdout, 'write').mockReturnValue(true);

        new StdoutTelemetryWriterAdapter().emit(EVENT);

        expect(mockWrite).toHaveBeenCalledWith(`${JSON.stringify(EVENT)}\n`);
    });

    it('writes a line a machine can parse back into the event', () => {
        const mockWrite = jest.spyOn(process.stdout, 'write').mockReturnValue(true);
        const event: TelemetryEvent = {
            ...EVENT,
            'http.query_keys': ['page', 'size'],
            'error.message': 'boom "quoted"\nsecond line',
        };

        new StdoutTelemetryWriterAdapter().emit(event);

        const [line] = mockWrite.mock.calls[0] as [string];

        expect(line.endsWith('\n')).toBe(true);
        expect(line.slice(0, -1)).not.toContain('\n');
        expect(JSON.parse(line) as TelemetryEvent).toEqual(event);
    });

    it('writes one line for each emitted event', () => {
        const mockWrite = jest.spyOn(process.stdout, 'write').mockReturnValue(true);
        const sut = new StdoutTelemetryWriterAdapter();

        sut.emit(EVENT);
        sut.emit({ ...EVENT, 'trace.id': 'other-correlation-id' });

        expect(mockWrite).toHaveBeenCalledTimes(2);
        expect(mockWrite).toHaveBeenNthCalledWith(1, `${JSON.stringify(EVENT)}\n`);
        expect(mockWrite).toHaveBeenNthCalledWith(
            2,
            `${JSON.stringify({ ...EVENT, 'trace.id': 'other-correlation-id' })}\n`,
        );
    });

    it('never throws when the write fails', () => {
        jest.spyOn(process.stdout, 'write').mockImplementation(() => {
            throw new Error('stdout closed');
        });

        expect(() => new StdoutTelemetryWriterAdapter().emit(EVENT)).not.toThrow();
    });

    it('returns nothing when the write fails, so the unit of work keeps going', () => {
        jest.spyOn(process.stdout, 'write').mockImplementation(() => {
            throw new Error('stdout closed');
        });

        expect(new StdoutTelemetryWriterAdapter().emit(EVENT)).toBeUndefined();
    });

    it('never throws when the event cannot be serialised', () => {
        const mockWrite = jest.spyOn(process.stdout, 'write').mockReturnValue(true);
        const circular = { ...EVENT } as TelemetryEvent & { self?: unknown };

        circular.self = circular;

        expect(() => new StdoutTelemetryWriterAdapter().emit(circular)).not.toThrow();
        expect(mockWrite).not.toHaveBeenCalled();
    });
});
