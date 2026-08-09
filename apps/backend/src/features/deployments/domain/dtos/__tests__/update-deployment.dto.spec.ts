// eslint-disable-next-line import/no-unassigned-import
import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import type { ValidationError } from 'class-validator';

import { UpdateDeploymentDto } from '../update-deployment.dto';

import type { DeploymentStatus } from '../../models/deployment.models';

/** Validates a raw payload exactly as the global ValidationPipe does. */
const validatePayload = (payload: Record<string, unknown>): ValidationError[] =>
    validateSync(plainToInstance(UpdateDeploymentDto, payload), {
        whitelist: true,
        forbidNonWhitelisted: true,
    });

/** Collects the constraint keys reported for a single property. */
const constraintsFor = (errors: ValidationError[], property: string): string[] =>
    Object.keys(errors.find((error) => error.property === property)?.constraints ?? {});

describe('UpdateDeploymentDto', () => {
    it('accepts a fully-valid payload with no validation errors', () => {
        expect(validatePayload({ status: 'failed', error: 'compose exited 1' })).toEqual([]);
    });

    it.each<DeploymentStatus>(['pending', 'running', 'success', 'failed'])(
        'accepts the %s status',
        (status: DeploymentStatus) => {
            expect(validatePayload({ status })).toEqual([]);
        },
    );

    it('requires status', () => {
        const errors = validatePayload({});

        expect(constraintsFor(errors, 'status')).toContain('isIn');
    });

    it('rejects a status outside the allowed set', () => {
        const errors = validatePayload({ status: 'cancelled' });

        expect(constraintsFor(errors, 'status')).toContain('isIn');
    });

    it('rejects a status differing only by case', () => {
        const errors = validatePayload({ status: 'Pending' });

        expect(constraintsFor(errors, 'status')).toContain('isIn');
    });

    it('rejects a non-string status', () => {
        const errors = validatePayload({ status: 1 });

        expect(constraintsFor(errors, 'status')).toContain('isIn');
    });

    it('accepts an omitted error, since it is optional', () => {
        expect(validatePayload({ status: 'success' })).toEqual([]);
    });

    it('accepts a null error, since IsOptional skips null values', () => {
        expect(validatePayload({ status: 'failed', error: null })).toEqual([]);
    });

    it('rejects a non-string error', () => {
        const errors = validatePayload({ status: 'failed', error: { message: 'boom' } });

        expect(constraintsFor(errors, 'error')).toContain('isString');
    });

    it('rejects an unknown property under forbidNonWhitelisted', () => {
        const errors = validatePayload({ status: 'success', finishedAt: '2026-01-01' });

        expect(constraintsFor(errors, 'finishedAt')).toContain('whitelistValidation');
    });
});
