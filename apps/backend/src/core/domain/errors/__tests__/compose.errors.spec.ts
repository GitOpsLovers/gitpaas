import { UnsafeComposeRecipeError } from '../compose.errors';
import { DomainError } from '../domain.error';

describe('UnsafeComposeRecipeError', () => {
    const key = 'services.web.privileged';
    const reason = 'GitPaaS allows no such key';

    it('is a DomainError', () => {
        expect(new UnsafeComposeRecipeError(key, reason)).toBeInstanceOf(DomainError);
    });

    it('sets its name to UnsafeComposeRecipeError', () => {
        expect(new UnsafeComposeRecipeError(key, reason).name).toBe('UnsafeComposeRecipeError');
    });

    it('carries the UNSAFE_COMPOSE_RECIPE code', () => {
        expect(new UnsafeComposeRecipeError(key, reason).code).toBe('UNSAFE_COMPOSE_RECIPE');
    });

    it('carries the key that failed', () => {
        expect(new UnsafeComposeRecipeError(key, reason).key).toBe(key);
    });

    it('builds a message carrying the key and the reason', () => {
        expect(new UnsafeComposeRecipeError(key, reason).message)
            .toBe(`The compose file declares "${key}", and GitPaaS refuses it: ${reason}`);
    });

    it('chains the original error through the cause option', () => {
        const original = new Error('parse failed');

        expect(new UnsafeComposeRecipeError(key, reason, { cause: original }).cause).toBe(original);
    });
});
