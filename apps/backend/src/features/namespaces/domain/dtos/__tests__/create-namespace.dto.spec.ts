// eslint-disable-next-line import/no-unassigned-import
import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import type { ValidationError } from 'class-validator';

import { CreateNamespaceDto } from '../create-namespace.dto';

/** Validates a raw payload exactly as the global ValidationPipe does. */
const validatePayload = (payload: Record<string, unknown>): ValidationError[] =>
    validateSync(plainToInstance(CreateNamespaceDto, payload), {
        whitelist: true,
        forbidNonWhitelisted: true,
    });

/** Collects the constraint keys reported for a single property. */
const constraintsFor = (errors: ValidationError[], property: string): string[] =>
    Object.keys(errors.find((error) => error.property === property)?.constraints ?? {});

/** A payload satisfying every rule of the DTO. */
const validPayload = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    name: 'platform',
    ...overrides,
});

describe('CreateNamespaceDto', () => {
    it('accepts a fully-valid payload with no validation errors', () => {
        expect(validatePayload(validPayload())).toEqual([]);
    });

    it('requires name', () => {
        const errors = validatePayload({});

        expect(constraintsFor(errors, 'name')).toEqual(expect.arrayContaining(['isString', 'isNotEmpty']));
    });

    it('rejects a non-string name', () => {
        const errors = validatePayload(validPayload({ name: 42 }));

        expect(constraintsFor(errors, 'name')).toContain('isString');
    });

    it('rejects a null name', () => {
        const errors = validatePayload(validPayload({ name: null }));

        expect(constraintsFor(errors, 'name')).toContain('isString');
    });

    it('rejects an empty name', () => {
        const errors = validatePayload(validPayload({ name: '' }));

        expect(constraintsFor(errors, 'name')).toContain('isNotEmpty');
    });

    it('accepts a whitespace-only name, as no trimming rule is declared', () => {
        expect(validatePayload(validPayload({ name: '   ' }))).toEqual([]);
    });

    it('rejects an unknown property under forbidNonWhitelisted', () => {
        const errors = validatePayload(validPayload({ id: 'injected' }));

        expect(constraintsFor(errors, 'id')).toContain('whitelistValidation');
    });

    it('rejects a projectsCount the client tries to force', () => {
        const errors = validatePayload(validPayload({ projectsCount: 10 }));

        expect(constraintsFor(errors, 'projectsCount')).toContain('whitelistValidation');
    });

    it('produces an instance of the DTO class', () => {
        expect(plainToInstance(CreateNamespaceDto, validPayload())).toBeInstanceOf(CreateNamespaceDto);
    });
});
