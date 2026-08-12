import type { WideEvent } from '../../../domain/models/wide-event.models';
import { StdoutWideEventSinkAdapter } from '../stdout-wide-event-sink.adapter';

/**
 * Minimal completed event the sink publishes.
 */
const EVENT: WideEvent = {
    timestamp: '2026-01-01T00:00:00.000Z',
    'event.name': 'http.request',
    'service.name': 'gitpaas-backend',
    'service.version': 'unknown',
    'service.env': 'test',
    'host.name': 'host',
    'process.pid': 1,
    'trace.id': 'correlation-id',
};

describe('StdoutWideEventSinkAdapter', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('writes one JSON line per event', () => {
        const mockWrite = jest.spyOn(process.stdout, 'write').mockReturnValue(true);

        new StdoutWideEventSinkAdapter().emit(EVENT);

        expect(mockWrite).toHaveBeenCalledWith(`${JSON.stringify(EVENT)}\n`);
    });

    it('writes a line a machine can parse back into the event', () => {
        const mockWrite = jest.spyOn(process.stdout, 'write').mockReturnValue(true);
        const event: WideEvent = {
            ...EVENT,
            'http.query_keys': ['page', 'size'],
            'error.message': 'boom "quoted"\nsecond line',
        };

        new StdoutWideEventSinkAdapter().emit(event);

        const [line] = mockWrite.mock.calls[0] as [string];

        expect(line.endsWith('\n')).toBe(true);
        expect(line.slice(0, -1)).not.toContain('\n');
        expect(JSON.parse(line) as WideEvent).toEqual(event);
    });

    it('writes one line for each emitted event', () => {
        const mockWrite = jest.spyOn(process.stdout, 'write').mockReturnValue(true);
        const sut = new StdoutWideEventSinkAdapter();

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

        expect(() => new StdoutWideEventSinkAdapter().emit(EVENT)).not.toThrow();
    });

    it('returns nothing when the write fails, so the unit of work keeps going', () => {
        jest.spyOn(process.stdout, 'write').mockImplementation(() => {
            throw new Error('stdout closed');
        });

        expect(new StdoutWideEventSinkAdapter().emit(EVENT)).toBeUndefined();
    });

    it('never throws when the event cannot be serialised', () => {
        const mockWrite = jest.spyOn(process.stdout, 'write').mockReturnValue(true);
        const circular = { ...EVENT } as WideEvent & { self?: unknown };

        circular.self = circular;

        expect(() => new StdoutWideEventSinkAdapter().emit(circular)).not.toThrow();
        expect(mockWrite).not.toHaveBeenCalled();
    });
});
