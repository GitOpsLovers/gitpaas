// eslint-disable-next-line import/no-unassigned-import
import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import type { ValidationError } from 'class-validator';

import { TriggerDeploymentDto } from '../trigger-deployment.dto';

/** Validates a raw payload exactly as the global ValidationPipe does. */
const validatePayload = (payload: Record<string, unknown>): ValidationError[] =>
    validateSync(plainToInstance(TriggerDeploymentDto, payload), {
        whitelist: true,
        forbidNonWhitelisted: true,
    });

/** Collects the constraint keys reported for a single property. */
const constraintsFor = (errors: ValidationError[], property: string): string[] =>
    Object.keys(errors.find((error) => error.property === property)?.constraints ?? {});

describe('TriggerDeploymentDto', () => {
    it('accepts a fully-valid payload with no validation errors', () => {
        expect(validatePayload({ serviceId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d' })).toEqual([]);
    });

    it('requires serviceId', () => {
        const errors = validatePayload({});

        expect(constraintsFor(errors, 'serviceId')).toEqual(expect.arrayContaining(['isUuid', 'isNotEmpty']));
    });

    it('rejects a serviceId that is not a UUID', () => {
        const errors = validatePayload({ serviceId: 'service-1' });

        expect(constraintsFor(errors, 'serviceId')).toContain('isUuid');
    });

    it('rejects an empty serviceId', () => {
        const errors = validatePayload({ serviceId: '' });

        expect(constraintsFor(errors, 'serviceId')).toEqual(expect.arrayContaining(['isUuid', 'isNotEmpty']));
    });

    it('rejects a non-string serviceId', () => {
        const errors = validatePayload({ serviceId: 7 });

        expect(constraintsFor(errors, 'serviceId')).toContain('isUuid');
    });

    it('rejects an unknown property under forbidNonWhitelisted', () => {
        const errors = validatePayload({
            serviceId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
            branch: 'main',
        });

        expect(constraintsFor(errors, 'branch')).toContain('whitelistValidation');
    });
});
