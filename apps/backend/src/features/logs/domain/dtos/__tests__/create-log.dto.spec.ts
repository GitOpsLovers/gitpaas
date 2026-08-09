// eslint-disable-next-line import/no-unassigned-import
import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import type { ValidationError } from 'class-validator';

import { CreateLogDto } from '../create-log.dto';

/** Validates a raw payload exactly as the global ValidationPipe does. */
const validatePayload = (payload: Record<string, unknown>): ValidationError[] =>
    validateSync(plainToInstance(CreateLogDto, payload), {
        whitelist: true,
        forbidNonWhitelisted: true,
    });

/** Collects the constraint keys reported for a single property. */
const constraintsFor = (errors: ValidationError[], property: string): string[] =>
    Object.keys(errors.find((error) => error.property === property)?.constraints ?? {});

/** A payload satisfying every rule of the DTO. */
const validPayload = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    deploymentId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    seq: 1,
    type: 'line',
    content: 'Pulling image…',
    status: null,
    ...overrides,
});

describe('CreateLogDto', () => {
    it('accepts a fully-valid payload with no validation errors', () => {
        expect(validatePayload(validPayload())).toEqual([]);
    });

    it('accepts a terminal end entry carrying a status', () => {
        expect(validatePayload(validPayload({ type: 'end', content: null, status: 'success' }))).toEqual([]);
    });

    it('requires deploymentId', () => {
        const payload = validPayload();
        delete payload.deploymentId;

        expect(constraintsFor(validatePayload(payload), 'deploymentId')).toContain('isUuid');
    });

    it('requires seq', () => {
        const payload = validPayload();
        delete payload.seq;

        expect(constraintsFor(validatePayload(payload), 'seq')).toEqual(
            expect.arrayContaining(['isInt', 'min']),
        );
    });

    it('requires type', () => {
        const payload = validPayload();
        delete payload.type;

        expect(constraintsFor(validatePayload(payload), 'type')).toContain('isIn');
    });

    it('rejects a deploymentId that is not a UUID', () => {
        const errors = validatePayload(validPayload({ deploymentId: 'deployment-1' }));

        expect(constraintsFor(errors, 'deploymentId')).toContain('isUuid');
    });

    it('rejects a non-integer seq', () => {
        const errors = validatePayload(validPayload({ seq: 1.5 }));

        expect(constraintsFor(errors, 'seq')).toContain('isInt');
    });

    it('rejects a stringified seq, as no implicit conversion is configured', () => {
        const errors = validatePayload(validPayload({ seq: '3' }));

        expect(constraintsFor(errors, 'seq')).toContain('isInt');
    });

    it.each([0, -1])('rejects the below-minimum seq %s', (seq: number) => {
        const errors = validatePayload(validPayload({ seq }));

        expect(constraintsFor(errors, 'seq')).toContain('min');
    });

    it('accepts the minimum seq of 1', () => {
        expect(validatePayload(validPayload({ seq: 1 }))).toEqual([]);
    });

    it.each(['line', 'end'])('accepts the %s type', (type: string) => {
        expect(validatePayload(validPayload({ type }))).toEqual([]);
    });

    it('rejects a type outside the allowed set', () => {
        const errors = validatePayload(validPayload({ type: 'error' }));

        expect(constraintsFor(errors, 'type')).toContain('isIn');
    });

    it('accepts an omitted content, since it is optional', () => {
        const payload = validPayload();
        delete payload.content;

        expect(validatePayload(payload)).toEqual([]);
    });

    it('rejects a non-string content', () => {
        const errors = validatePayload(validPayload({ content: 42 }));

        expect(constraintsFor(errors, 'content')).toContain('isString');
    });

    it.each(['success', 'failed'])('accepts the %s status', (status: string) => {
        expect(validatePayload(validPayload({ status }))).toEqual([]);
    });

    it('rejects a status outside the allowed set', () => {
        const errors = validatePayload(validPayload({ status: 'cancelled' }));

        expect(constraintsFor(errors, 'status')).toContain('isIn');
    });

    it('rejects an unknown property under forbidNonWhitelisted', () => {
        const errors = validatePayload(validPayload({ createdAt: '2026-01-01' }));

        expect(constraintsFor(errors, 'createdAt')).toContain('whitelistValidation');
    });
});
