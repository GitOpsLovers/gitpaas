import { RefreshTokenDbEntity } from '../refresh-token-db.entity';
import { toRefreshToken } from '../refresh-tokens-db.transformer';

describe('toRefreshToken', () => {
    it('maps every refresh token entity field into the domain model', () => {
        const entity: RefreshTokenDbEntity = {
            id: 'record-1',
            userId: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
            jti: 'b1a2c3d4-0000-0000-0000-000000000000',
            tokenHash: 'sha256-hash',
            expiresAt: new Date('2026-07-18T00:00:00.000Z'),
            revoked: false,
            createdAt: new Date('2026-07-11T00:00:00.000Z'),
            updatedAt: new Date('2026-07-11T00:01:00.000Z'),
        };

        expect(toRefreshToken(entity)).toEqual({
            id: 'record-1',
            userId: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
            jti: 'b1a2c3d4-0000-0000-0000-000000000000',
            tokenHash: 'sha256-hash',
            expiresAt: new Date('2026-07-18T00:00:00.000Z'),
            revoked: false,
            createdAt: new Date('2026-07-11T00:00:00.000Z'),
            updatedAt: new Date('2026-07-11T00:01:00.000Z'),
        });
    });

    it('omits the ORM relation column from the domain model', () => {
        const entity: RefreshTokenDbEntity = {
            id: 'record-2',
            userId: 'a1b2c3d4-0000-0000-0000-000000000000',
            jti: 'jti-2',
            tokenHash: 'hash',
            expiresAt: new Date('2026-07-18T00:00:00.000Z'),
            revoked: true,
            createdAt: new Date('2026-07-11T00:00:00.000Z'),
            updatedAt: new Date('2026-07-11T00:00:00.000Z'),
            user: { id: 'a1b2c3d4-0000-0000-0000-000000000000' } as RefreshTokenDbEntity['user'],
        };

        const result = toRefreshToken(entity);

        expect(result).not.toHaveProperty('user');
        expect(result.revoked).toBe(true);
    });
});
