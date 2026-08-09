// eslint-disable-next-line import/no-unassigned-import
import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import type { ValidationError } from 'class-validator';

import { RemoveImageDto } from '../remove-image.dto';

/** Validates a raw payload exactly as the global ValidationPipe does. */
const validatePayload = (payload: Record<string, unknown>): ValidationError[] =>
    validateSync(plainToInstance(RemoveImageDto, payload), {
        whitelist: true,
        forbidNonWhitelisted: true,
    });

/** Collects the constraint keys reported for a single property. */
const constraintsFor = (errors: ValidationError[], property: string): string[] =>
    Object.keys(errors.find((error) => error.property === property)?.constraints ?? {});

describe('RemoveImageDto', () => {
    it('accepts a fully-valid payload with no validation errors', () => {
        expect(validatePayload({ force: true })).toEqual([]);
    });

    it('accepts an empty payload, since force is optional', () => {
        expect(validatePayload({})).toEqual([]);
    });

    it('rejects a stringified boolean force', () => {
        const errors = validatePayload({ force: 'true' });

        expect(constraintsFor(errors, 'force')).toContain('isBoolean');
    });

    it('rejects a numeric force, as no implicit conversion is configured', () => {
        const errors = validatePayload({ force: 0 });

        expect(constraintsFor(errors, 'force')).toContain('isBoolean');
    });

    it('accepts a null force, since IsOptional skips null values', () => {
        expect(validatePayload({ force: null })).toEqual([]);
    });

    it('rejects an unknown property under forbidNonWhitelisted', () => {
        const errors = validatePayload({ force: true, removeVolumes: true });

        expect(constraintsFor(errors, 'removeVolumes')).toContain('whitelistValidation');
    });
});
