import { DbLogEntity } from '../db-log.entity';
import { toLogEntry } from '../db-logs.transformer';

describe('toLogEntry', () => {
    it('maps a "line" log entity onto the line event variant, carrying its content as data', () => {
        const createdAt = new Date('2026-07-11T00:00:01.000Z');
        const entity: DbLogEntity = {
            id: 'l-1',
            deploymentId: 'd-1',
            seq: 1,
            type: 'line',
            content: 'Pulling image...',
            status: null,
            createdAt,
        };

        expect(toLogEntry(entity)).toEqual({
            id: 'l-1',
            deploymentId: 'd-1',
            seq: 1,
            createdAt,
            type: 'line',
            data: 'Pulling image...',
        });
    });

    it('maps an "end" log entity onto the end event variant, carrying its terminal status', () => {
        const createdAt = new Date('2026-07-11T00:00:09.000Z');
        const entity: DbLogEntity = {
            id: 'l-2',
            deploymentId: 'd-1',
            seq: 9,
            type: 'end',
            content: null,
            status: 'success',
            createdAt,
        };

        expect(toLogEntry(entity)).toEqual({
            id: 'l-2',
            deploymentId: 'd-1',
            seq: 9,
            createdAt,
            type: 'end',
            status: 'success',
        });
    });
});
