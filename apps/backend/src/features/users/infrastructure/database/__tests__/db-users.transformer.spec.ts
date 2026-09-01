import { UserRole } from '../../../domain/models/user.models';
import { DbUserEntity } from '../db-user.entity';
import { toUser } from '../db-users.transformer';

describe('toUser', () => {
    it('maps every user entity field into the domain model', () => {
        const entity: DbUserEntity = {
            id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
            email: 'admin@example.com',
            passwordHash: 'argon2-hash',
            displayName: 'Ada Lovelace',
            totpSecret: 'sealed-secret',
            totpEnabledAt: new Date('2026-07-11T00:02:00.000Z'),
            role: UserRole.Admin,
            isActive: true,
            createdAt: new Date('2026-07-11T00:00:00.000Z'),
            updatedAt: new Date('2026-07-11T00:01:00.000Z'),
        };

        expect(toUser(entity)).toEqual({
            id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
            email: 'admin@example.com',
            passwordHash: 'argon2-hash',
            displayName: 'Ada Lovelace',
            totpSecret: 'sealed-secret',
            totpEnabledAt: new Date('2026-07-11T00:02:00.000Z'),
            role: UserRole.Admin,
            isActive: true,
            createdAt: new Date('2026-07-11T00:00:00.000Z'),
            updatedAt: new Date('2026-07-11T00:01:00.000Z'),
        });
    });

    it('preserves the deactivated flag and the user role', () => {
        const entity: DbUserEntity = {
            id: 'a1b2c3d4-0000-0000-0000-000000000000',
            email: 'user@example.com',
            passwordHash: 'hash',
            displayName: null,
            totpSecret: null,
            totpEnabledAt: null,
            role: UserRole.User,
            isActive: false,
            createdAt: new Date('2026-07-11T00:00:00.000Z'),
            updatedAt: new Date('2026-07-11T00:00:00.000Z'),
        };

        const result = toUser(entity);

        expect(result.role).toBe(UserRole.User);
        expect(result.isActive).toBe(false);
    });

    it('maps an account with no display name and no second factor as null', () => {
        const entity: DbUserEntity = {
            id: 'a1b2c3d4-0000-0000-0000-000000000000',
            email: 'user@example.com',
            passwordHash: 'hash',
            displayName: null,
            totpSecret: null,
            totpEnabledAt: null,
            role: UserRole.User,
            isActive: true,
            createdAt: new Date('2026-07-11T00:00:00.000Z'),
            updatedAt: new Date('2026-07-11T00:00:00.000Z'),
        };

        const result = toUser(entity);

        expect(result.displayName).toBeNull();
        expect(result.totpSecret).toBeNull();
        expect(result.totpEnabledAt).toBeNull();
    });

    it('maps a setup of the second factor that nobody confirmed', () => {
        const entity: DbUserEntity = {
            id: 'a1b2c3d4-0000-0000-0000-000000000000',
            email: 'user@example.com',
            passwordHash: 'hash',
            displayName: 'Ada',
            totpSecret: 'sealed-secret',
            totpEnabledAt: null,
            role: UserRole.User,
            isActive: true,
            createdAt: new Date('2026-07-11T00:00:00.000Z'),
            updatedAt: new Date('2026-07-11T00:00:00.000Z'),
        };

        const result = toUser(entity);

        expect(result.totpSecret).toBe('sealed-secret');
        expect(result.totpEnabledAt).toBeNull();
    });
});
