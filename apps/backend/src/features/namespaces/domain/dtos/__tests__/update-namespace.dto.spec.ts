// eslint-disable-next-line import/no-unassigned-import
import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import type { ValidationError } from 'class-validator';

import { UpdateNamespaceDto } from '../update-namespace.dto';

/** Validates a raw payload exactly as the global ValidationPipe does. */
const validatePayload = (payload: Record<string, unknown>): ValidationError[] =>
    validateSync(plainToInstance(UpdateNamespaceDto, payload), {
        whitelist: true,
        forbidNonWhitelisted: true,
    });

/** Collects the constraint keys reported for a single property. */
const constraintsFor = (errors: ValidationError[], property: string): string[] =>
    Object.keys(errors.find((error) => error.property === property)?.constraints ?? {});

/** A payload satisfying every rule of the DTO. */
const validPayload = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    name: 'platform-renamed',
    ...overrides,
});

describe('UpdateNamespaceDto', () => {
    it('accepts a fully-valid payload with no validation errors', () => {
        expect(validatePayload(validPayload())).toEqual([]);
    });

    it('requires name even on an update', () => {
        const errors = validatePayload({});

        expect(constraintsFor(errors, 'name')).toEqual(expect.arrayContaining(['isString', 'isNotEmpty']));
    });

    it('rejects a non-string name', () => {
        const errors = validatePayload(validPayload({ name: ['platform'] }));

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
        const errors = validatePayload(validPayload({ createdAt: '2026-01-01' }));

        expect(constraintsFor(errors, 'createdAt')).toContain('whitelistValidation');
    });

    it('rejects an id the client tries to move through the body', () => {
        const errors = validatePayload(validPayload({ id: 'b2a2132b-d6b7-464a-8aaf-c659a3ca0d60' }));

        expect(constraintsFor(errors, 'id')).toContain('whitelistValidation');
    });

    it('produces an instance of the DTO class', () => {
        expect(plainToInstance(UpdateNamespaceDto, validPayload())).toBeInstanceOf(UpdateNamespaceDto);
    });
});
