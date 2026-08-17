import {
    PROVIDER_PERMISSION_LEVELS,
    REQUIRED_PROVIDER_PERMISSIONS,
} from '../../domain/constants/provider-permissions.constants';
import { findMissingProviderPermissions } from '../find-missing-provider-permissions';

describe('findMissingProviderPermissions', () => {
    it('needs exactly contents and metadata, both at the level read', () => {
        expect(REQUIRED_PROVIDER_PERMISSIONS).toEqual({ contents: 'read', metadata: 'read' });
    });

    it('orders the levels read, write and admin', () => {
        expect(PROVIDER_PERMISSION_LEVELS).toEqual(['read', 'write', 'admin']);
    });

    it('counts no permission as missing when the App carries the exact level of each one', () => {
        expect(findMissingProviderPermissions({ contents: 'read', metadata: 'read' })).toEqual([]);
    });

    it('counts the permission contents as present when the App carries a higher level', () => {
        expect(findMissingProviderPermissions({ contents: 'write', metadata: 'read' })).toEqual([]);
    });

    it('counts every permission as present when the App carries the highest level of each one', () => {
        expect(findMissingProviderPermissions({ contents: 'admin', metadata: 'admin' })).toEqual([]);
    });

    it('counts the permission contents as missing when the answer names no level for it', () => {
        expect(findMissingProviderPermissions({ metadata: 'read' })).toEqual(['contents']);
    });

    it('counts a permission as missing when its level is outside read, write and admin', () => {
        expect(findMissingProviderPermissions({ contents: 'none', metadata: 'read' })).toEqual(['contents']);
    });

    it('counts every needed permission as missing when the argument is undefined', () => {
        expect(findMissingProviderPermissions(undefined)).toEqual(['contents', 'metadata']);
    });

    it('counts every needed permission as missing when the App carries no permission at all', () => {
        expect(findMissingProviderPermissions({})).toEqual(['contents', 'metadata']);
    });

    it('ignores a permission the platform does not need', () => {
        expect(
            findMissingProviderPermissions({ contents: 'read', metadata: 'read', issues: 'write' }),
        ).toEqual([]);
    });
});
