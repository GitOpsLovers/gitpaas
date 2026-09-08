/* eslint-disable no-secrets/no-secrets */
import { providerRegistrationStateSchema } from '../provider-registration.contract';

/** A state as the platform draws it: thirty-two random bytes in hexadecimal. */
const state = 'f1e2d3c4b5a60718293a4b5c6d7e8f901a2b3c4d5e6f708192a3b4c5d6e7f809';

describe('providerRegistrationStateSchema', () => {
    it('accepts a state of sixty-four hexadecimal characters', () => {
        expect(providerRegistrationStateSchema.safeParse(state).success).toBe(true);
    });

    it('refuses a state that is too short', () => {
        expect(providerRegistrationStateSchema.safeParse(state.slice(0, 63)).success).toBe(false);
    });

    it('refuses a state that is too long', () => {
        expect(providerRegistrationStateSchema.safeParse(`${state}0`).success).toBe(false);
    });

    it('refuses a state in capital letters, because the platform writes it in small ones', () => {
        expect(providerRegistrationStateSchema.safeParse(state.toUpperCase()).success).toBe(false);
    });

    it('refuses a state that carries a character of a path', () => {
        expect(providerRegistrationStateSchema.safeParse('../../etc/passwd').success).toBe(false);
    });

    it('refuses an empty state', () => {
        expect(providerRegistrationStateSchema.safeParse('').success).toBe(false);
    });

    it('refuses a state that is no text', () => {
        expect(providerRegistrationStateSchema.safeParse(42).success).toBe(false);
    });
});
