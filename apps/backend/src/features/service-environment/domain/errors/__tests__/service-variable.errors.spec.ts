import {
    ServiceVariableNameTakenError,
    ServiceVariableNotDecryptableError,
    ServiceVariableNotFoundError,
} from '../service-variable.errors';

import { DomainError } from '@core/domain/errors/domain.error';

const variableId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
const serviceId = 'f4f8c2a0-6d3b-4d0a-9b6e-2c1d5e8a7b90';

describe('ServiceVariableNotFoundError', () => {
    it('is an Error', () => {
        expect(new ServiceVariableNotFoundError(variableId)).toBeInstanceOf(Error);
    });

    it('is a DomainError', () => {
        expect(new ServiceVariableNotFoundError(variableId)).toBeInstanceOf(DomainError);
    });

    it('sets its name to ServiceVariableNotFoundError', () => {
        expect(new ServiceVariableNotFoundError(variableId).name).toBe('ServiceVariableNotFoundError');
    });

    it('carries the VARIABLE_NOT_FOUND code', () => {
        expect(new ServiceVariableNotFoundError(variableId).code).toBe('VARIABLE_NOT_FOUND');
    });

    it('builds a message carrying the variable identifier', () => {
        expect(new ServiceVariableNotFoundError(variableId).message).toBe(`Variable ${variableId} not found`);
    });

    it('carries the identifier it received, and not a fixed one', () => {
        expect(new ServiceVariableNotFoundError('another-id').message).toBe('Variable another-id not found');
    });

    it('chains the original error through the cause option', () => {
        const original = new Error('row is gone');

        expect(new ServiceVariableNotFoundError(variableId, { cause: original }).cause).toBe(original);
    });
});

describe('ServiceVariableNameTakenError', () => {
    it('is an Error', () => {
        expect(new ServiceVariableNameTakenError('DATABASE_URL', serviceId)).toBeInstanceOf(Error);
    });

    it('is a DomainError', () => {
        expect(new ServiceVariableNameTakenError('DATABASE_URL', serviceId)).toBeInstanceOf(DomainError);
    });

    it('sets its name to ServiceVariableNameTakenError', () => {
        expect(new ServiceVariableNameTakenError('DATABASE_URL', serviceId).name)
            .toBe('ServiceVariableNameTakenError');
    });

    it('carries the VARIABLE_NAME_TAKEN code', () => {
        expect(new ServiceVariableNameTakenError('DATABASE_URL', serviceId).code).toBe('VARIABLE_NAME_TAKEN');
    });

    it('builds a message carrying the name and the service identifier', () => {
        expect(new ServiceVariableNameTakenError('DATABASE_URL', serviceId).message).toBe(
            `Variable DATABASE_URL already exists in service ${serviceId}`,
        );
    });

    it('carries the name it received, and not a fixed one', () => {
        expect(new ServiceVariableNameTakenError('API_KEY', serviceId).message).toBe(
            `Variable API_KEY already exists in service ${serviceId}`,
        );
    });

    it('chains the original error through the cause option', () => {
        const original = new Error('unique index violation');

        expect(new ServiceVariableNameTakenError('API_KEY', serviceId, { cause: original }).cause)
            .toBe(original);
    });
});

describe('ServiceVariableNotDecryptableError', () => {
    it('carries the code of a secret that the key does not open', () => {
        expect(new ServiceVariableNotDecryptableError('API_KEY').code).toBe('VARIABLE_NOT_DECRYPTABLE');
    });

    it('builds a message that names the variable, and never its value', () => {
        expect(new ServiceVariableNotDecryptableError('API_KEY').message).toBe('The secret API_KEY cannot be decrypted');
    });

    it('chains the original error through the cause option', () => {
        const original = new Error('unable to authenticate data');

        expect(new ServiceVariableNotDecryptableError('API_KEY', { cause: original }).cause).toBe(original);
    });
});
