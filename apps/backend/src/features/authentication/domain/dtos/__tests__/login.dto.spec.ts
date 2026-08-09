// eslint-disable-next-line import/no-unassigned-import
import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import type { ValidationError } from 'class-validator';

import { LoginDto } from '../login.dto';

/** Validates a raw payload exactly as the global ValidationPipe does. */
const validatePayload = (payload: Record<string, unknown>): ValidationError[] =>
    validateSync(plainToInstance(LoginDto, payload), {
        whitelist: true,
        forbidNonWhitelisted: true,
    });

/** Collects the constraint keys reported for a single property. */
const constraintsFor = (errors: ValidationError[], property: string): string[] =>
    Object.keys(errors.find((error) => error.property === property)?.constraints ?? {});

/** A payload satisfying every rule of the DTO. */
const validPayload = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    email: 'admin@gitpaas.dev',
    password: 'sup3r-s3cret',
    ...overrides,
});

describe('LoginDto', () => {
    it('accepts a fully-valid payload with no validation errors', () => {
        expect(validatePayload(validPayload())).toEqual([]);
    });

    it('requires email', () => {
        const errors = validatePayload({ password: 'sup3r-s3cret' });

        expect(constraintsFor(errors, 'email')).toEqual(expect.arrayContaining(['isEmail', 'isNotEmpty']));
    });

    it('requires password', () => {
        const errors = validatePayload({ email: 'admin@gitpaas.dev' });

        expect(constraintsFor(errors, 'password')).toEqual(expect.arrayContaining(['isString', 'isNotEmpty']));
    });

    it.each(['not-an-email', 'admin@', '@gitpaas.dev', 'admin gitpaas.dev'])(
        'rejects the malformed email %s',
        (email: string) => {
            const errors = validatePayload(validPayload({ email }));

            expect(constraintsFor(errors, 'email')).toContain('isEmail');
        },
    );

    it('rejects a non-string email', () => {
        const errors = validatePayload(validPayload({ email: 1234 }));

        expect(constraintsFor(errors, 'email')).toContain('isEmail');
    });

    it('rejects an empty password', () => {
        const errors = validatePayload(validPayload({ password: '' }));

        expect(constraintsFor(errors, 'password')).toContain('isNotEmpty');
    });

    it('rejects a non-string password', () => {
        const errors = validatePayload(validPayload({ password: 12345678 }));

        expect(constraintsFor(errors, 'password')).toContain('isString');
    });

    it('rejects an unknown property under forbidNonWhitelisted', () => {
        const errors = validatePayload(validPayload({ role: 'admin' }));

        expect(constraintsFor(errors, 'role')).toContain('whitelistValidation');
    });
});
