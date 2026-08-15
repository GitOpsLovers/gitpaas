// eslint-disable-next-line import/no-unassigned-import
import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import type { ValidationError } from 'class-validator';

import { UpdateServiceDto } from '../update-service.dto';

/** Validates a raw payload exactly as the global ValidationPipe does. */
const validatePayload = (payload: Record<string, unknown>): ValidationError[] =>
    validateSync(plainToInstance(UpdateServiceDto, payload), {
        whitelist: true,
        forbidNonWhitelisted: true,
    });

/** Collects the constraint keys reported for a single property. */
const constraintsFor = (errors: ValidationError[], property: string): string[] =>
    Object.keys(errors.find((error) => error.property === property)?.constraints ?? {});

/** A payload satisfying every rule of the DTO. */
const validPayload = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    name: 'api',
    providerId: 'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f',
    repositoryId: '123456',
    deploymentBranch: 'main',
    composerPath: 'docker-compose.yml',
    ...overrides,
});

describe('UpdateServiceDto', () => {
    it('accepts a fully-valid payload with no validation errors', () => {
        expect(validatePayload(validPayload())).toEqual([]);
    });

    it('accepts a payload carrying only the required name', () => {
        expect(validatePayload({ name: 'api' })).toEqual([]);
    });

    it('requires name', () => {
        const errors = validatePayload({ deploymentBranch: 'main' });

        expect(constraintsFor(errors, 'name')).toEqual(expect.arrayContaining(['isString', 'isNotEmpty']));
    });

    it('rejects an empty name', () => {
        const errors = validatePayload(validPayload({ name: '' }));

        expect(constraintsFor(errors, 'name')).toContain('isNotEmpty');
    });

    it.each(['repositoryId', 'deploymentBranch', 'composerPath'])(
        'rejects a non-string %s',
        (property: string) => {
            const errors = validatePayload(validPayload({ [property]: 10 }));

            expect(constraintsFor(errors, property)).toContain('isString');
        },
    );

    it.each(['repositoryId', 'deploymentBranch', 'composerPath'])(
        'accepts an undefined %s, as it is optional',
        (property: string) => {
            const payload = validPayload();
            const { [property]: _removed, ...payloadWithoutProperty } = payload;

            expect(validatePayload(payloadWithoutProperty)).toEqual([]);
        },
    );

    it.each(['repositoryId', 'deploymentBranch', 'composerPath'])(
        'accepts a null %s, since IsOptional skips null values',
        (property: string) => {
            expect(validatePayload(validPayload({ [property]: null }))).toEqual([]);
        },
    );

    it('accepts an undefined providerId, as it is optional', () => {
        const { providerId: _removed, ...payloadWithoutProvider } = validPayload();

        expect(validatePayload(payloadWithoutProvider)).toEqual([]);
    });

    it('rejects a providerId that is not a UUID', () => {
        const errors = validatePayload(validPayload({ providerId: 'not-a-uuid' }));

        expect(constraintsFor(errors, 'providerId')).toContain('isUuid');
    });

    it('rejects an unknown property under forbidNonWhitelisted', () => {
        const errors = validatePayload(validPayload({ projectId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d' }));

        expect(constraintsFor(errors, 'projectId')).toContain('whitelistValidation');
    });
});
