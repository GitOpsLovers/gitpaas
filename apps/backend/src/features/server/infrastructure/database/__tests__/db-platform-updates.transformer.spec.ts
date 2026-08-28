import { DbPlatformUpdateEntity } from '../db-platform-update.entity';
import { toPlatformUpdate } from '../db-platform-updates.transformer';

/** Builds a platform update database-entity fixture, overriding only the fields under test. */
const updateEntity = (overrides: Partial<DbPlatformUpdateEntity> = {}): DbPlatformUpdateEntity => ({
    id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    targetVersion: 'v2.2.0',
    step: 'Pulling the images ...',
    percent: 60,
    state: 'running',
    error: null,
    startedAt: new Date('2026-08-28T10:00:00.000Z'),
    ...overrides,
});

describe('toPlatformUpdate', () => {
    it('maps every field of the row of the update', () => {
        expect(toPlatformUpdate(updateEntity())).toEqual({
            id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
            targetVersion: 'v2.2.0',
            step: 'Pulling the images ...',
            percent: 60,
            state: 'running',
            error: null,
            startedAt: '2026-08-28T10:00:00.000Z',
        });
    });

    it('carries the reason of a failure', () => {
        const result = toPlatformUpdate(updateEntity({ state: 'failed', error: 'Could not pull the images.' }));

        expect(result.state).toBe('failed');
        expect(result.error).toBe('Could not pull the images.');
    });

    it('writes the moment the update started as an ISO date', () => {
        const result = toPlatformUpdate(updateEntity({ startedAt: new Date('2026-01-02T03:04:05.000Z') }));

        expect(result.startedAt).toBe('2026-01-02T03:04:05.000Z');
    });
});
