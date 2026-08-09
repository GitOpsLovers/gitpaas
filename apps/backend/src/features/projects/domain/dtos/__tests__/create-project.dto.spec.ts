// eslint-disable-next-line import/no-unassigned-import
import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import type { ValidationError } from 'class-validator';

import { CreateProjectDto } from '../create-project.dto';

/** Validates a raw payload exactly as the global ValidationPipe does. */
const validatePayload = (payload: Record<string, unknown>): ValidationError[] =>
    validateSync(plainToInstance(CreateProjectDto, payload), {
        whitelist: true,
        forbidNonWhitelisted: true,
    });

/** Collects the constraint keys reported for a single property. */
const constraintsFor = (errors: ValidationError[], property: string): string[] =>
    Object.keys(errors.find((error) => error.property === property)?.constraints ?? {});

/** A payload satisfying every rule of the DTO. */
const validPayload = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    name: 'gitpaas',
    ...overrides,
});

describe('CreateProjectDto', () => {
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

    it('rejects an empty name', () => {
        const errors = validatePayload(validPayload({ name: '' }));

        expect(constraintsFor(errors, 'name')).toContain('isNotEmpty');
    });

    it('rejects an unknown property under forbidNonWhitelisted', () => {
        const errors = validatePayload(validPayload({ id: 'injected' }));

        expect(constraintsFor(errors, 'id')).toContain('whitelistValidation');
    });

    it('produces an instance of the DTO class', () => {
        expect(plainToInstance(CreateProjectDto, validPayload())).toBeInstanceOf(CreateProjectDto);
    });
});
