// eslint-disable-next-line import/no-unassigned-import
import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import type { ValidationError } from 'class-validator';

import { CreateServiceDto } from '../create-service.dto';

/** Validates a raw payload exactly as the global ValidationPipe does. */
const validatePayload = (payload: Record<string, unknown>): ValidationError[] =>
    validateSync(plainToInstance(CreateServiceDto, payload), {
        whitelist: true,
        forbidNonWhitelisted: true,
    });

/** Collects the constraint keys reported for a single property. */
const constraintsFor = (errors: ValidationError[], property: string): string[] =>
    Object.keys(errors.find((error) => error.property === property)?.constraints ?? {});

/** A payload satisfying every rule of the DTO. */
const validPayload = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    name: 'api',
    projectId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    ...overrides,
});

describe('CreateServiceDto', () => {
    it('accepts a fully-valid payload with no validation errors', () => {
        expect(validatePayload(validPayload())).toEqual([]);
    });

    it('requires name', () => {
        const errors = validatePayload({ projectId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d' });

        expect(constraintsFor(errors, 'name')).toEqual(expect.arrayContaining(['isString', 'isNotEmpty']));
    });

    it('requires projectId', () => {
        const errors = validatePayload({ name: 'api' });

        expect(constraintsFor(errors, 'projectId')).toEqual(expect.arrayContaining(['isUuid', 'isNotEmpty']));
    });

    it('rejects a non-string name', () => {
        const errors = validatePayload(validPayload({ name: 7 }));

        expect(constraintsFor(errors, 'name')).toContain('isString');
    });

    it('rejects an empty name', () => {
        const errors = validatePayload(validPayload({ name: '' }));

        expect(constraintsFor(errors, 'name')).toContain('isNotEmpty');
    });

    it('rejects a projectId that is not a UUID', () => {
        const errors = validatePayload(validPayload({ projectId: 'not-a-uuid' }));

        expect(constraintsFor(errors, 'projectId')).toContain('isUuid');
    });

    it('rejects a numeric projectId', () => {
        const errors = validatePayload(validPayload({ projectId: 42 }));

        expect(constraintsFor(errors, 'projectId')).toContain('isUuid');
    });

    it('rejects an unknown property under forbidNonWhitelisted', () => {
        const errors = validatePayload(validPayload({ repositoryId: 'gh-1' }));

        expect(constraintsFor(errors, 'repositoryId')).toContain('whitelistValidation');
    });
});
