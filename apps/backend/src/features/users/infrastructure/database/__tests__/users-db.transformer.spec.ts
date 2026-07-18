import { UserRole } from '../../../domain/models/user.model';
import { UserDbEntity } from '../user-db.entity';
import { toUser } from '../users-db.transformer';

describe('toUser', () => {
    it('maps every user entity field into the domain model', () => {
        const entity: UserDbEntity = {
            id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
            email: 'admin@example.com',
            passwordHash: 'argon2-hash',
            role: UserRole.Admin,
            isActive: true,
            createdAt: new Date('2026-07-11T00:00:00.000Z'),
            updatedAt: new Date('2026-07-11T00:01:00.000Z'),
        };

        expect(toUser(entity)).toEqual({
            id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
            email: 'admin@example.com',
            passwordHash: 'argon2-hash',
            role: UserRole.Admin,
            isActive: true,
            createdAt: new Date('2026-07-11T00:00:00.000Z'),
            updatedAt: new Date('2026-07-11T00:01:00.000Z'),
        });
    });

    it('preserves the deactivated flag and the user role', () => {
        const entity: UserDbEntity = {
            id: 'a1b2c3d4-0000-0000-0000-000000000000',
            email: 'user@example.com',
            passwordHash: 'hash',
            role: UserRole.User,
            isActive: false,
            createdAt: new Date('2026-07-11T00:00:00.000Z'),
            updatedAt: new Date('2026-07-11T00:00:00.000Z'),
        };

        const result = toUser(entity);

        expect(result.role).toBe(UserRole.User);
        expect(result.isActive).toBe(false);
    });
});
