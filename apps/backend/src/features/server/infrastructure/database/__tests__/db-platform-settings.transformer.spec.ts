import { DbPlatformSettingsEntity } from '../db-platform-settings.entity';
import { toPlatformSettings } from '../db-platform-settings.transformer';

/** Builds a platform settings database-entity fixture, overriding only the fields under test. */
const settingsEntity = (overrides: Partial<DbPlatformSettingsEntity> = {}): DbPlatformSettingsEntity => ({
    id: 1,
    logRetentionDays: 30,
    gitpaasDomain: null,
    publicHostAddress: null,
    updatedAt: new Date('2026-08-21T00:00:00.000Z'),
    ...overrides,
});

describe('toPlatformSettings', () => {
    it('maps the age of a log from the row of the settings', () => {
        expect(toPlatformSettings(settingsEntity({ logRetentionDays: 90 }))).toEqual({ logRetentionDays: 90 });
    });

    it('maps the host of the control plane from the row of the settings', () => {
        const result = toPlatformSettings(settingsEntity({ gitpaasDomain: 'gitpaas.example.com' }));

        expect(result.gitpaasDomain).toBe('gitpaas.example.com');
    });

    it('leaves the host of the control plane absent while the column is empty', () => {
        expect(toPlatformSettings(settingsEntity({ gitpaasDomain: null })).gitpaasDomain).toBeUndefined();
    });

    it('maps the public address of the host from the row of the settings', () => {
        const result = toPlatformSettings(settingsEntity({ publicHostAddress: '2001:db8::1' }));

        expect(result.publicHostAddress).toBe('2001:db8::1');
    });

    it('leaves the public address of the host absent while the column is empty', () => {
        expect(toPlatformSettings(settingsEntity({ publicHostAddress: null })).publicHostAddress).toBeUndefined();
    });

    it('never carries the columns of the storage of the row', () => {
        expect(Object.keys(toPlatformSettings(settingsEntity()))).toEqual([
            'logRetentionDays',
            'gitpaasDomain',
            'publicHostAddress',
        ]);
    });
});
