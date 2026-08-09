// eslint-disable-next-line import/no-unassigned-import
import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import type { ValidationError } from 'class-validator';

import { RemoveContainerDto } from '../remove-container.dto';

/** Validates a raw payload exactly as the global ValidationPipe does. */
const validatePayload = (payload: Record<string, unknown>): ValidationError[] =>
    validateSync(plainToInstance(RemoveContainerDto, payload), {
        whitelist: true,
        forbidNonWhitelisted: true,
    });

/** Collects the constraint keys reported for a single property. */
const constraintsFor = (errors: ValidationError[], property: string): string[] =>
    Object.keys(errors.find((error) => error.property === property)?.constraints ?? {});

describe('RemoveContainerDto', () => {
    it('accepts a fully-valid payload with no validation errors', () => {
        expect(validatePayload({ force: true, removeVolumes: false })).toEqual([]);
    });

    it('accepts an empty payload, since every field is optional', () => {
        expect(validatePayload({})).toEqual([]);
    });

    it.each(['force', 'removeVolumes'])('rejects a non-boolean %s', (property: string) => {
        const errors = validatePayload({ [property]: 'true' });

        expect(constraintsFor(errors, property)).toContain('isBoolean');
    });

    it.each(['force', 'removeVolumes'])(
        'rejects a numeric %s, as no implicit conversion is configured',
        (property: string) => {
            const errors = validatePayload({ [property]: 1 });

            expect(constraintsFor(errors, property)).toContain('isBoolean');
        },
    );

    it.each(['force', 'removeVolumes'])(
        'accepts a null %s, since IsOptional skips null values',
        (property: string) => {
            expect(validatePayload({ [property]: null })).toEqual([]);
        },
    );

    it('rejects an unknown property under forbidNonWhitelisted', () => {
        const errors = validatePayload({ force: true, prune: true });

        expect(constraintsFor(errors, 'prune')).toContain('whitelistValidation');
    });

    it('keeps the declared boolean values on the produced instance', () => {
        const instance = plainToInstance(RemoveContainerDto, { force: true, removeVolumes: false });

        expect(instance).toEqual({ force: true, removeVolumes: false });
    });
});
