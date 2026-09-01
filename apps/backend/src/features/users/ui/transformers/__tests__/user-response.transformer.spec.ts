import { User, UserRole } from '../../../domain/models/user.models';
import { toUserResponse } from '../user-response.transformer';

/** Builds a domain user fixture, overriding only the fields under test. */
const user = (overrides: Partial<User> = {}): User => ({
    id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    email: 'operator@gitpaas.dev',
    passwordHash: 'secret-hash',
    displayName: 'Ada Lovelace',
    totpSecret: null,
    totpEnabledAt: null,
    role: UserRole.Admin,
    isActive: true,
    createdAt: new Date('2026-07-11T00:00:00.000Z'),
    updatedAt: new Date('2026-07-12T00:00:00.000Z'),
    ...overrides,
});

describe('toUserResponse', () => {
    it('maps every public field of the user into the shape of the answer', () => {
        expect(toUserResponse(user())).toEqual({
            id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
            email: 'operator@gitpaas.dev',
            displayName: 'Ada Lovelace',
            role: UserRole.Admin,
            totpEnabled: false,
            isActive: true,
            createdAt: '2026-07-11T00:00:00.000Z',
            updatedAt: '2026-07-12T00:00:00.000Z',
        });
    });

    it('never carries the hash of the password', () => {
        expect(toUserResponse(user())).not.toHaveProperty('passwordHash');
    });

    it('converts each timestamp into a text of the ISO form', () => {
        const response = toUserResponse(user());

        expect(typeof response.createdAt).toBe('string');
        expect(typeof response.updatedAt).toBe('string');
    });

    it('never carries the hash of the password of a user that a caller hands whole', () => {
        const response = toUserResponse(user({ passwordHash: '$argon2id$v=19$leaked' }));

        expect(response).not.toHaveProperty('passwordHash');
        expect(Object.values(response)).not.toContain('$argon2id$v=19$leaked');
    });

    it('maps a profile that already carries no hash of the password', () => {
        const { passwordHash: _passwordHash, ...profile } = user();

        expect(toUserResponse(profile)).toEqual({
            id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
            email: 'operator@gitpaas.dev',
            displayName: 'Ada Lovelace',
            role: UserRole.Admin,
            totpEnabled: false,
            isActive: true,
            createdAt: '2026-07-11T00:00:00.000Z',
            updatedAt: '2026-07-12T00:00:00.000Z',
        });
    });

    it('never lets a date reach the answer', () => {
        const response = toUserResponse(user());

        expect(Object.values<unknown>(response).some((value) => value instanceof Date)).toBe(false);
    });

    it('preserves the role and the deactivation of an account', () => {
        const response = toUserResponse(user({ role: UserRole.User, isActive: false }));

        expect(response).toMatchObject({ role: UserRole.User, isActive: false });
    });

    it('carries a display name that nobody wrote as null', () => {
        expect(toUserResponse(user({ displayName: null })).displayName).toBeNull();
    });

    it('reports the second factor as on when the user confirmed it', () => {
        const response = toUserResponse(
            user({ totpSecret: 'sealed-secret', totpEnabledAt: new Date('2026-07-13T00:00:00.000Z') }),
        );

        expect(response.totpEnabled).toBe(true);
    });

    it('reports the second factor as off when a setup holds a secret that nobody confirmed', () => {
        const response = toUserResponse(user({ totpSecret: 'sealed-secret', totpEnabledAt: null }));

        expect(response.totpEnabled).toBe(false);
    });

    it('never carries the secret of the second factor', () => {
        const response = toUserResponse(
            user({ totpSecret: 'JBSWY3DPEHPK3PXP', totpEnabledAt: new Date('2026-07-13T00:00:00.000Z') }),
        );

        expect(response).not.toHaveProperty('totpSecret');
        expect(response).not.toHaveProperty('totpEnabledAt');
        expect(Object.values(response)).not.toContain('JBSWY3DPEHPK3PXP');
    });
});
