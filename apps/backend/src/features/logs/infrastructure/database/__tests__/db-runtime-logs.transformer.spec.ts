import { DbRuntimeLogEntity } from '../db-runtime-log.entity';
import { toRuntimeLogEntry } from '../db-runtime-logs.transformer';

/** Builds a runtime log database-entity fixture, overriding only the fields under test. */
const runtimeLogEntity = (overrides: Partial<DbRuntimeLogEntity> = {}): DbRuntimeLogEntity => ({
    id: '17',
    containerId: 'e3b0c44298fc',
    timestamp: new Date('2026-08-21T11:59:00.000Z'),
    source: 'stdout',
    text: 'listening on 3000',
    createdAt: new Date('2026-08-21T12:00:00.000Z'),
    ...overrides,
});

describe('toRuntimeLogEntry', () => {
    it('maps every column of the row onto the domain entry', () => {
        const result = toRuntimeLogEntry(runtimeLogEntity());

        expect(result).toEqual({
            id: '17',
            containerId: 'e3b0c44298fc',
            timestamp: new Date('2026-08-21T11:59:00.000Z'),
            source: 'stdout',
            text: 'listening on 3000',
            createdAt: new Date('2026-08-21T12:00:00.000Z'),
        });
    });

    it('keeps the stream of the error of a row that names it', () => {
        const result = toRuntimeLogEntry(runtimeLogEntity({ source: 'stderr' }));

        expect(result.source).toBe('stderr');
    });

    it('falls back to the stream of the output when the row names an unknown one', () => {
        const result = toRuntimeLogEntry(runtimeLogEntity({ source: 'console' as DbRuntimeLogEntity['source'] }));

        expect(result.source).toBe('stdout');
    });
});
