import { resolveRequestIdUseCase } from '../resolve-request-id.use-case';

/** RFC 4122 shape of a generated correlation id. */
const UUID_PATTERN = /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/;

describe('resolveRequestIdUseCase', () => {
    it('keeps a sane inbound id', () => {
        expect(resolveRequestIdUseCase('abc-123')).toBe('abc-123');
    });

    it('trims the inbound id', () => {
        expect(resolveRequestIdUseCase('  abc-123  ')).toBe('abc-123');
    });

    it('keeps the first value of a repeated header', () => {
        expect(resolveRequestIdUseCase(['first', 'second'])).toBe('first');
    });

    it('generates a UUID when there is no inbound id', () => {
        expect(resolveRequestIdUseCase(undefined)).toMatch(UUID_PATTERN);
    });

    it('generates a UUID for a blank inbound id', () => {
        expect(resolveRequestIdUseCase('   ')).toMatch(UUID_PATTERN);
    });

    it('keeps an inbound id of exactly the maximum length', () => {
        const maximumLengthId = 'x'.repeat(128);

        expect(resolveRequestIdUseCase(maximumLengthId)).toBe(maximumLengthId);
    });

    it('generates a UUID for an oversized inbound id', () => {
        expect(resolveRequestIdUseCase('x'.repeat(129))).toMatch(UUID_PATTERN);
    });

    it('generates a UUID for a non-string inbound value', () => {
        expect(resolveRequestIdUseCase(42)).toMatch(UUID_PATTERN);
    });

    it('generates a different id on each call', () => {
        expect(resolveRequestIdUseCase(undefined)).not.toBe(resolveRequestIdUseCase(undefined));
    });
});
