/* eslint-disable no-secrets/no-secrets */
import {
    PROFILE_DISPLAY_NAME_MAX_LENGTH,
    profileSchema,
    updateProfileEmailSchema,
    updateProfileNameSchema,
    updateProfilePasswordSchema,
} from '../profile.contract';

/** A payload satisfying every rule of `profileSchema`. */
const validProfile = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    id: '9c858901-8a57-4791-81fe-4c455b099bc9',
    email: 'admin@example.com',
    displayName: 'Ada Lovelace',
    role: 'admin',
    totpEnabled: false,
    isActive: true,
    createdAt: '2026-07-11T00:00:00.000Z',
    updatedAt: '2026-07-11T00:00:00.000Z',
    ...overrides,
});

describe('profileSchema', () => {
    it('accepts a valid account', () => {
        expect(profileSchema.safeParse(validProfile()).success).toBe(true);
    });

    it('accepts an account with no display name', () => {
        expect(profileSchema.safeParse(validProfile({ displayName: null })).success).toBe(true);
    });

    it('refuses an account whose role is unknown', () => {
        expect(profileSchema.safeParse(validProfile({ role: 'owner' })).success).toBe(false);
    });
});

describe('updateProfileNameSchema', () => {
    it('accepts a display name', () => {
        expect(updateProfileNameSchema.safeParse({ displayName: 'Ada Lovelace' }).success).toBe(true);
    });

    it('trims the spaces around the display name', () => {
        expect(updateProfileNameSchema.parse({ displayName: '  Ada Lovelace  ' }).displayName).toBe('Ada Lovelace');
    });

    it('accepts a null, so the caller can clear the display name', () => {
        expect(updateProfileNameSchema.parse({ displayName: null }).displayName).toBeNull();
    });

    it('refuses a display name that holds only spaces', () => {
        expect(updateProfileNameSchema.safeParse({ displayName: '   ' }).success).toBe(false);
    });

    it('refuses a display name longer than the greatest count of the characters', () => {
        const tooLong = 'a'.repeat(PROFILE_DISPLAY_NAME_MAX_LENGTH + 1);

        expect(updateProfileNameSchema.safeParse({ displayName: tooLong }).success).toBe(false);
    });

    it('refuses a property the schema does not declare', () => {
        expect(updateProfileNameSchema.safeParse({ displayName: 'Ada', role: 'admin' }).success).toBe(false);
    });
});

describe('updateProfileEmailSchema', () => {
    it('accepts an email address', () => {
        expect(updateProfileEmailSchema.safeParse({ email: 'ada@example.com' }).success).toBe(true);
    });

    it('refuses a value that is no email address', () => {
        expect(updateProfileEmailSchema.safeParse({ email: 'ada-at-example' }).success).toBe(false);
    });

    it('refuses a property the schema does not declare', () => {
        expect(updateProfileEmailSchema.safeParse({ email: 'ada@example.com', isActive: true }).success).toBe(false);
    });
});

describe('updateProfilePasswordSchema', () => {
    it('accepts both passwords', () => {
        expect(
            updateProfilePasswordSchema.safeParse({ currentPassword: 'old', newPassword: 'new-secret' }).success,
        ).toBe(true);
    });

    it('refuses a new password that is too short', () => {
        expect(
            updateProfilePasswordSchema.safeParse({ currentPassword: 'old', newPassword: 'short' }).success,
        ).toBe(false);
    });

    it('refuses an empty current password', () => {
        expect(
            updateProfilePasswordSchema.safeParse({ currentPassword: '', newPassword: 'new-secret' }).success,
        ).toBe(false);
    });

    it('refuses a property the schema does not declare', () => {
        expect(
            updateProfilePasswordSchema.safeParse({
                currentPassword: 'old',
                newPassword: 'new-secret',
                userId: 'x',
            }).success,
        ).toBe(false);
    });
});
