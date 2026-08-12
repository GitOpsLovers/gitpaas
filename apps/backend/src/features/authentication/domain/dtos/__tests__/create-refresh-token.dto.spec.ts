/* eslint-disable no-secrets/no-secrets */
// eslint-disable-next-line import/no-unassigned-import
import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import type { ValidationError } from 'class-validator';

import { CreateRefreshTokenDto } from '../create-refresh-token.dto';

/** Validates a raw payload exactly as the global ValidationPipe does. */
const validatePayload = (payload: Record<string, unknown>): ValidationError[] =>
    validateSync(plainToInstance(CreateRefreshTokenDto, payload), {
        whitelist: true,
        forbidNonWhitelisted: true,
    });

/** Collects the constraint keys reported for a single property. */
const constraintsFor = (errors: ValidationError[], property: string): string[] =>
    Object.keys(errors.find((error) => error.property === property)?.constraints ?? {});

/** A payload satisfying every rule of the DTO. */
const validPayload = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    userId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    jti: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    tokenHash: '$argon2id$v=19$m=65536,t=3,p=4$hash',
    expiresAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
});

describe('CreateRefreshTokenDto', () => {
    it('accepts a fully-valid payload with no validation errors', () => {
        expect(validatePayload(validPayload())).toEqual([]);
    });

    it('requires userId', () => {
        const payload = validPayload();
        delete payload.userId;

        expect(constraintsFor(validatePayload(payload), 'userId')).toEqual(
            expect.arrayContaining(['isUuid', 'isNotEmpty']),
        );
    });

    it('requires jti', () => {
        const payload = validPayload();
        delete payload.jti;

        expect(constraintsFor(validatePayload(payload), 'jti')).toEqual(
            expect.arrayContaining(['isString', 'isNotEmpty']),
        );
    });

    it('requires tokenHash', () => {
        const payload = validPayload();
        delete payload.tokenHash;

        expect(constraintsFor(validatePayload(payload), 'tokenHash')).toEqual(
            expect.arrayContaining(['isString', 'isNotEmpty']),
        );
    });

    it('requires expiresAt', () => {
        const payload = validPayload();
        delete payload.expiresAt;

        expect(constraintsFor(validatePayload(payload), 'expiresAt')).toContain('isDate');
    });

    it('rejects a userId that is not a UUID', () => {
        const errors = validatePayload(validPayload({ userId: 'user-1' }));

        expect(constraintsFor(errors, 'userId')).toContain('isUuid');
    });

    it.each(['jti', 'tokenHash'])('rejects a non-string %s', (property: string) => {
        const errors = validatePayload(validPayload({ [property]: 99 }));

        expect(constraintsFor(errors, property)).toContain('isString');
    });

    it.each(['jti', 'tokenHash'])('rejects an empty %s', (property: string) => {
        const errors = validatePayload(validPayload({ [property]: '' }));

        expect(constraintsFor(errors, property)).toContain('isNotEmpty');
    });

    it('rejects an ISO string expiresAt, since no @Type(() => Date) conversion is declared', () => {
        const errors = validatePayload(validPayload({ expiresAt: '2026-01-01T00:00:00.000Z' }));

        expect(constraintsFor(errors, 'expiresAt')).toContain('isDate');
    });

    it('rejects an invalid Date instance for expiresAt', () => {
        const errors = validatePayload(validPayload({ expiresAt: new Date('nope') }));

        expect(constraintsFor(errors, 'expiresAt')).toContain('isDate');
    });

    it('rejects an unknown property under forbidNonWhitelisted', () => {
        const errors = validatePayload(validPayload({ revokedAt: null }));

        expect(constraintsFor(errors, 'revokedAt')).toContain('whitelistValidation');
    });
});
