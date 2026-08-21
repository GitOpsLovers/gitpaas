import { DbPlatformSettingsEntity } from '../db-platform-settings.entity';
import { toPlatformSettings } from '../db-platform-settings.transformer';

/** Builds a platform settings database-entity fixture, overriding only the fields under test. */
const settingsEntity = (overrides: Partial<DbPlatformSettingsEntity> = {}): DbPlatformSettingsEntity => ({
    id: 1,
    logRetentionDays: 30,
    updatedAt: new Date('2026-08-21T00:00:00.000Z'),
    ...overrides,
});

describe('toPlatformSettings', () => {
    it('maps the age of a log from the row of the settings', () => {
        expect(toPlatformSettings(settingsEntity({ logRetentionDays: 90 }))).toEqual({ logRetentionDays: 90 });
    });

    it('never carries the columns of the storage of the row', () => {
        expect(Object.keys(toPlatformSettings(settingsEntity()))).toEqual(['logRetentionDays']);
    });
});
