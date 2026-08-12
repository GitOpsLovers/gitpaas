/* eslint-disable no-secrets/no-secrets */
// eslint-disable-next-line import/no-unassigned-import
import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import type { ValidationError } from 'class-validator';

import { RefreshDto } from '../refresh.dto';

/** A structurally valid, signed-looking JWT (header.payload.signature). */
const JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';

/** Validates a raw payload exactly as the global ValidationPipe does. */
const validatePayload = (payload: Record<string, unknown>): ValidationError[] =>
    validateSync(plainToInstance(RefreshDto, payload), {
        whitelist: true,
        forbidNonWhitelisted: true,
    });

/** Collects the constraint keys reported for a single property. */
const constraintsFor = (errors: ValidationError[], property: string): string[] =>
    Object.keys(errors.find((error) => error.property === property)?.constraints ?? {});

describe('RefreshDto', () => {
    it('accepts a fully-valid payload with no validation errors', () => {
        expect(validatePayload({ refreshToken: JWT })).toEqual([]);
    });

    it('requires refreshToken', () => {
        const errors = validatePayload({});

        expect(constraintsFor(errors, 'refreshToken')).toEqual(
            expect.arrayContaining(['isString', 'isNotEmpty', 'isJwt']),
        );
    });

    it('rejects an empty refreshToken', () => {
        const errors = validatePayload({ refreshToken: '' });

        expect(constraintsFor(errors, 'refreshToken')).toContain('isNotEmpty');
    });

    it('rejects a non-string refreshToken', () => {
        const errors = validatePayload({ refreshToken: 42 });

        expect(constraintsFor(errors, 'refreshToken')).toContain('isString');
    });

    it('rejects an opaque token that is not JWT-shaped', () => {
        const errors = validatePayload({ refreshToken: 'opaque-refresh-token' });

        expect(constraintsFor(errors, 'refreshToken')).toContain('isJwt');
    });

    it('rejects a token missing its signature segment', () => {
        const errors = validatePayload({ refreshToken: JWT.split('.').slice(0, 2).join('.') });

        expect(constraintsFor(errors, 'refreshToken')).toContain('isJwt');
    });

    it('rejects an unknown property under forbidNonWhitelisted', () => {
        const errors = validatePayload({ refreshToken: JWT, accessToken: JWT });

        expect(constraintsFor(errors, 'accessToken')).toContain('whitelistValidation');
    });
});
