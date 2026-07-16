import { LogDbEntity } from '../log-db.entity';
import { toLog } from '../logs-db.transformer';

describe('toLog', () => {
    it('maps a "line" log entity, keeping content set and status null', () => {
        const createdAt = new Date('2026-07-11T00:00:01.000Z');
        const entity: LogDbEntity = {
            id: 'l-1',
            deploymentId: 'd-1',
            seq: 1,
            type: 'line',
            content: 'Pulling image...',
            status: null,
            createdAt,
        };

        expect(toLog(entity)).toEqual({
            id: 'l-1',
            deploymentId: 'd-1',
            seq: 1,
            type: 'line',
            content: 'Pulling image...',
            status: null,
            createdAt,
        });
    });

    it('maps an "end" log entity, keeping status set and content null', () => {
        const createdAt = new Date('2026-07-11T00:00:09.000Z');
        const entity: LogDbEntity = {
            id: 'l-2',
            deploymentId: 'd-1',
            seq: 9,
            type: 'end',
            content: null,
            status: 'success',
            createdAt,
        };

        expect(toLog(entity)).toEqual({
            id: 'l-2',
            deploymentId: 'd-1',
            seq: 9,
            type: 'end',
            content: null,
            status: 'success',
            createdAt,
        });
    });
});
