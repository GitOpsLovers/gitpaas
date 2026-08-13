// eslint-disable-next-line import/no-unassigned-import
import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import type { ValidationError } from 'class-validator';

import { CreateDeploymentDto } from '../create-deployment.dto';

/** Validates a raw payload exactly as the global ValidationPipe does. */
const validatePayload = (payload: Record<string, unknown>): ValidationError[] =>
    validateSync(plainToInstance(CreateDeploymentDto, payload), {
        whitelist: true,
        forbidNonWhitelisted: true,
    });

/** Collects the constraint keys reported for a single property. */
const constraintsFor = (errors: ValidationError[], property: string): string[] =>
    Object.keys(errors.find((error) => error.property === property)?.constraints ?? {});

/** A payload satisfying every rule of the DTO. */
const validPayload = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    serviceId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    branch: 'main',
    commit: '9f8e7d6c5b4a39281706f5e4d3c2b1a098765432',
    commitMessage: 'feat: ship it',
    composerPath: 'docker-compose.yml',
    triggeredBy: 'admin@gitpaas.dev',
    ...overrides,
});

/** Every string-typed, required property of the DTO. */
const STRING_PROPERTIES = ['branch', 'commit', 'commitMessage', 'composerPath', 'triggeredBy'];

describe('CreateDeploymentDto', () => {
    it('accepts a fully-valid payload with no validation errors', () => {
        expect(validatePayload(validPayload())).toEqual([]);
    });

    it('requires serviceId', () => {
        const payload = validPayload();
        delete payload.serviceId;

        expect(constraintsFor(validatePayload(payload), 'serviceId')).toEqual(
            expect.arrayContaining(['isUuid', 'isNotEmpty']),
        );
    });

    it.each(STRING_PROPERTIES)('requires %s', (property: string) => {
        const payload = validPayload();
        // eslint-disable-next-line security/detect-object-injection, @typescript-eslint/no-dynamic-delete
        delete payload[property];

        expect(constraintsFor(validatePayload(payload), property)).toEqual(
            expect.arrayContaining(['isString', 'isNotEmpty']),
        );
    });

    it.each(STRING_PROPERTIES)('rejects a non-string %s', (property: string) => {
        const errors = validatePayload(validPayload({ [property]: 1 }));

        expect(constraintsFor(errors, property)).toContain('isString');
    });

    it.each(STRING_PROPERTIES)('rejects an empty %s', (property: string) => {
        const errors = validatePayload(validPayload({ [property]: '' }));

        expect(constraintsFor(errors, property)).toContain('isNotEmpty');
    });

    it('rejects a serviceId that is not a UUID', () => {
        const errors = validatePayload(validPayload({ serviceId: 'service-1' }));

        expect(constraintsFor(errors, 'serviceId')).toContain('isUuid');
    });

    it('reports every invalid property at once', () => {
        const errors = validatePayload({});

        expect(errors.map((error) => error.property).sort()).toEqual(
            ['branch', 'commit', 'commitMessage', 'composerPath', 'serviceId', 'triggeredBy'].sort(),
        );
    });

    it('rejects an unknown property under forbidNonWhitelisted', () => {
        const errors = validatePayload(validPayload({ status: 'pending' }));

        expect(constraintsFor(errors, 'status')).toContain('whitelistValidation');
    });
});
