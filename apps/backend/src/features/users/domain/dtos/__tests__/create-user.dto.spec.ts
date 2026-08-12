// eslint-disable-next-line import/no-unassigned-import
import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import type { ValidationError } from 'class-validator';

import { UserRole } from '../../models/user.models';
import { CreateUserDto } from '../create-user.dto';

/** Validates a raw payload exactly as the global ValidationPipe does. */
const validatePayload = (payload: Record<string, unknown>): ValidationError[] =>
    validateSync(plainToInstance(CreateUserDto, payload), {
        whitelist: true,
        forbidNonWhitelisted: true,
    });

/** Collects the constraint keys reported for a single property. */
const constraintsFor = (errors: ValidationError[], property: string): string[] =>
    Object.keys(errors.find((error) => error.property === property)?.constraints ?? {});

/** A payload satisfying every rule of the DTO. */
const validPayload = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    email: 'admin@gitpaas.dev',
    passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$hash',
    role: UserRole.Admin,
    isActive: true,
    ...overrides,
});

describe('CreateUserDto', () => {
    it('accepts a fully-valid payload with no validation errors', () => {
        expect(validatePayload(validPayload())).toEqual([]);
    });

    it('accepts a payload carrying only the required fields', () => {
        expect(
            validatePayload({ email: 'user@gitpaas.dev', passwordHash: 'hashed' }),
        ).toEqual([]);
    });

    it('requires email', () => {
        const payload = validPayload();
        delete payload.email;

        expect(constraintsFor(validatePayload(payload), 'email')).toEqual(
            expect.arrayContaining(['isEmail', 'isNotEmpty']),
        );
    });

    it('requires passwordHash', () => {
        const payload = validPayload();
        delete payload.passwordHash;

        expect(constraintsFor(validatePayload(payload), 'passwordHash')).toEqual(
            expect.arrayContaining(['isString', 'isNotEmpty']),
        );
    });

    it('rejects a malformed email', () => {
        const errors = validatePayload(validPayload({ email: 'admin@' }));

        expect(constraintsFor(errors, 'email')).toContain('isEmail');
    });

    it('rejects an empty passwordHash', () => {
        const errors = validatePayload(validPayload({ passwordHash: '' }));

        expect(constraintsFor(errors, 'passwordHash')).toContain('isNotEmpty');
    });

    it('rejects a non-string passwordHash', () => {
        const errors = validatePayload(validPayload({ passwordHash: 123 }));

        expect(constraintsFor(errors, 'passwordHash')).toContain('isString');
    });

    it.each([UserRole.Admin, UserRole.User])('accepts the %s role', (role: UserRole) => {
        expect(validatePayload(validPayload({ role }))).toEqual([]);
    });

    it('rejects a role outside the UserRole enum', () => {
        const errors = validatePayload(validPayload({ role: 'superadmin' }));

        expect(constraintsFor(errors, 'role')).toContain('isEnum');
    });

    it('rejects an enum key instead of its value for role', () => {
        const errors = validatePayload(validPayload({ role: 'Admin' }));

        expect(constraintsFor(errors, 'role')).toContain('isEnum');
    });

    it('accepts a null role, since IsOptional skips null values', () => {
        expect(validatePayload(validPayload({ role: null }))).toEqual([]);
    });

    it('rejects a stringified boolean isActive, as no implicit conversion is configured', () => {
        const errors = validatePayload(validPayload({ isActive: 'true' }));

        expect(constraintsFor(errors, 'isActive')).toContain('isBoolean');
    });

    it('accepts a false isActive', () => {
        expect(validatePayload(validPayload({ isActive: false }))).toEqual([]);
    });

    it('rejects an unknown property under forbidNonWhitelisted', () => {
        const errors = validatePayload(validPayload({ password: 'plain-text' }));

        expect(constraintsFor(errors, 'password')).toContain('whitelistValidation');
    });
});
