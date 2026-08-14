// eslint-disable-next-line import/no-unassigned-import
import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import type { ValidationError } from 'class-validator';

import { CreateProjectInNamespaceDto } from '../create-project-in-namespace.dto';

/** Validates a raw payload exactly as the global ValidationPipe does. */
const validatePayload = (payload: Record<string, unknown>): ValidationError[] =>
    validateSync(plainToInstance(CreateProjectInNamespaceDto, payload), {
        whitelist: true,
        forbidNonWhitelisted: true,
    });

/** Collects the constraint keys reported for a single property. */
const constraintsFor = (errors: ValidationError[], property: string): string[] =>
    Object.keys(errors.find((error) => error.property === property)?.constraints ?? {});

/** A payload satisfying every rule of the DTO. */
const validPayload = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    name: 'gitpaas',
    namespaceId: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
    ...overrides,
});

describe('CreateProjectInNamespaceDto', () => {
    it('accepts a fully-valid payload with no validation errors', () => {
        expect(validatePayload(validPayload())).toEqual([]);
    });

    it('requires name', () => {
        const payload = validPayload();
        delete payload.name;

        expect(constraintsFor(validatePayload(payload), 'name')).toEqual(
            expect.arrayContaining(['isString', 'isNotEmpty']),
        );
    });

    it('rejects a non-string name', () => {
        const errors = validatePayload(validPayload({ name: 42 }));

        expect(constraintsFor(errors, 'name')).toContain('isString');
    });

    it('rejects an empty name', () => {
        const errors = validatePayload(validPayload({ name: '' }));

        expect(constraintsFor(errors, 'name')).toContain('isNotEmpty');
    });

    it('requires namespaceId', () => {
        const payload = validPayload();
        delete payload.namespaceId;

        expect(constraintsFor(validatePayload(payload), 'namespaceId')).toEqual(
            expect.arrayContaining(['isUuid', 'isNotEmpty']),
        );
    });

    it('rejects a non-UUID namespaceId', () => {
        const errors = validatePayload(validPayload({ namespaceId: 'namespace-1' }));

        expect(constraintsFor(errors, 'namespaceId')).toContain('isUuid');
    });

    it('rejects an empty namespaceId', () => {
        const errors = validatePayload(validPayload({ namespaceId: '' }));

        expect(constraintsFor(errors, 'namespaceId')).toEqual(
            expect.arrayContaining(['isUuid', 'isNotEmpty']),
        );
    });

    it('rejects a non-string namespaceId', () => {
        const errors = validatePayload(validPayload({ namespaceId: 42 }));

        expect(constraintsFor(errors, 'namespaceId')).toContain('isUuid');
    });

    it('reports every invalid property at once', () => {
        const errors = validatePayload({});

        expect(errors.map((error) => error.property).sort()).toEqual(['name', 'namespaceId']);
    });

    it('rejects an unknown property under forbidNonWhitelisted', () => {
        const errors = validatePayload(validPayload({ id: 'injected' }));

        expect(constraintsFor(errors, 'id')).toContain('whitelistValidation');
    });

    it('produces an instance of the DTO class', () => {
        expect(plainToInstance(CreateProjectInNamespaceDto, validPayload())).toBeInstanceOf(
            CreateProjectInNamespaceDto,
        );
    });
});
