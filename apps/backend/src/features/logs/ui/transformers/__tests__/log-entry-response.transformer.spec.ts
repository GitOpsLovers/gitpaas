import { LogArchive, LogEntry } from '../../../domain/models/log-entry.models';
import { toLogArchiveResponse, toLogEntryResponse } from '../log-entry-response.transformer';

const createdAt = new Date('2026-07-11T00:00:00.000Z');

/** A log entry that carries one line of output. */
type LogLineEntry = Extract<LogEntry, { type: 'line' }>;

/** Builds a domain log entry of a line, overriding only the fields under test. */
const lineEntry = (overrides: Partial<LogLineEntry> = {}): LogLineEntry => ({
    id: 'a1b2c3d4-0000-0000-0000-000000000000',
    deploymentId: 'c1a2b3c4-d5e6-47f8-9a0b-1c2d3e4f5a6b',
    seq: 1,
    createdAt,
    type: 'line',
    data: 'building…',
    ...overrides,
});

describe('toLogEntryResponse', () => {
    it('maps every field of an entry of a line into the shape of the answer', () => {
        expect(toLogEntryResponse(lineEntry())).toEqual({
            id: 'a1b2c3d4-0000-0000-0000-000000000000',
            deploymentId: 'c1a2b3c4-d5e6-47f8-9a0b-1c2d3e4f5a6b',
            seq: 1,
            createdAt: '2026-07-11T00:00:00.000Z',
            type: 'line',
            data: 'building…',
        });
    });

    it('maps every field of an entry of the end into the shape of the answer', () => {
        const entry: LogEntry = {
            id: 'a1b2c3d4-0000-0000-0000-000000000001',
            deploymentId: 'c1a2b3c4-d5e6-47f8-9a0b-1c2d3e4f5a6b',
            seq: 2,
            createdAt,
            type: 'end',
            status: 'failed',
        };

        expect(toLogEntryResponse(entry)).toEqual({
            id: 'a1b2c3d4-0000-0000-0000-000000000001',
            deploymentId: 'c1a2b3c4-d5e6-47f8-9a0b-1c2d3e4f5a6b',
            seq: 2,
            createdAt: '2026-07-11T00:00:00.000Z',
            type: 'end',
            status: 'failed',
        });
    });

    it('converts the timestamp into a text of the ISO form', () => {
        expect(typeof toLogEntryResponse(lineEntry()).createdAt).toBe('string');
    });

    it('keeps an empty line empty', () => {
        expect(toLogEntryResponse(lineEntry({ data: '' }))).toMatchObject({ data: '' });
    });

    it('never carries the field of the end on an entry of a line', () => {
        expect(toLogEntryResponse(lineEntry())).not.toHaveProperty('status');
    });

    it('never carries the field of a line on an entry of the end', () => {
        const entry: LogEntry = { ...lineEntry(), type: 'end', status: 'success' };

        expect(toLogEntryResponse(entry)).not.toHaveProperty('data');
    });

    it('keeps the status of a run that ended well', () => {
        const entry: LogEntry = {
            id: 'a1b2c3d4-0000-0000-0000-000000000002',
            deploymentId: 'c1a2b3c4-d5e6-47f8-9a0b-1c2d3e4f5a6b',
            seq: 3,
            createdAt,
            type: 'end',
            status: 'success',
        };

        expect(toLogEntryResponse(entry)).toMatchObject({ type: 'end', status: 'success' });
    });

    it('never lets a date reach the answer', () => {
        const response = toLogEntryResponse(lineEntry());

        expect((Object.values(response) as unknown[]).some((value) => value instanceof Date)).toBe(false);
    });
});

describe('toLogArchiveResponse', () => {
    const archive = (state: LogArchive['state'], entries: LogEntry[]): LogArchive => ({ state, entries });

    it('maps every entry of an archive that holds output', () => {
        expect(toLogArchiveResponse(archive('available', [lineEntry()]))).toEqual({
            state: 'available',
            entries: [{
                id: 'a1b2c3d4-0000-0000-0000-000000000000',
                deploymentId: 'c1a2b3c4-d5e6-47f8-9a0b-1c2d3e4f5a6b',
                seq: 1,
                createdAt: '2026-07-11T00:00:00.000Z',
                type: 'line',
                data: 'building…',
            }],
        });
    });

    it('keeps the state of a run that has not ended, with an empty list', () => {
        expect(toLogArchiveResponse(archive('running', []))).toEqual({ state: 'running', entries: [] });
    });

    it('keeps the state of an output that went away, with an empty list', () => {
        expect(toLogArchiveResponse(archive('expired', []))).toEqual({ state: 'expired', entries: [] });
    });
});
