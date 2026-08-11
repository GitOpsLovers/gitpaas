import { LogEntry } from '../../../domain/models/log-entry.models';
import { toCreateLogDto, toLogEventFromEntry } from '../db-log-store.transformer';

describe('toLogEventFromEntry', () => {
    const metadata = {
        id: 'l-1',
        deploymentId: 'd-1',
        createdAt: new Date('2026-07-11T00:00:01.000Z'),
    };

    it('maps a stored line entry onto its domain event, dropping the sequence', () => {
        const entry: LogEntry = {
            ...metadata, seq: 1, type: 'line', data: 'building',
        };

        expect(toLogEventFromEntry(entry)).toEqual({ type: 'line', data: 'building' });
    });

    it('maps a stored terminal entry onto its domain event, dropping the sequence', () => {
        const entry: LogEntry = {
            ...metadata, seq: 2, type: 'end', status: 'success',
        };

        expect(toLogEventFromEntry(entry)).toEqual({ type: 'end', status: 'success' });
    });
});

describe('toCreateLogDto', () => {
    it('writes a line event into the content column and leaves the status null', () => {
        expect(toCreateLogDto('d-1', { seq: 4, type: 'line', data: 'stack up' })).toEqual({
            deploymentId: 'd-1',
            seq: 4,
            type: 'line',
            content: 'stack up',
            status: null,
        });
    });

    it('writes a terminal event into the status column and leaves the content null', () => {
        expect(toCreateLogDto('d-1', { seq: 5, type: 'end', status: 'success' })).toEqual({
            deploymentId: 'd-1',
            seq: 5,
            type: 'end',
            content: null,
            status: 'success',
        });
    });
});
