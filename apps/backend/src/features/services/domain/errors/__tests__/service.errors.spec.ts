import { ServiceNameTakenError, ServiceNotFoundError } from '../service.errors';

import { DomainError } from '@core/domain/errors/domain.error';

const serviceId = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

describe('ServiceNotFoundError', () => {
    it('is an Error', () => {
        expect(new ServiceNotFoundError(serviceId)).toBeInstanceOf(Error);
    });

    it('is a DomainError', () => {
        expect(new ServiceNotFoundError(serviceId)).toBeInstanceOf(DomainError);
    });

    it('sets its name to ServiceNotFoundError', () => {
        expect(new ServiceNotFoundError(serviceId).name).toBe('ServiceNotFoundError');
    });

    it('carries the SERVICE_NOT_FOUND code', () => {
        expect(new ServiceNotFoundError(serviceId).code).toBe('SERVICE_NOT_FOUND');
    });

    it('builds a message carrying the service identifier', () => {
        expect(new ServiceNotFoundError(serviceId).message).toBe(`Service ${serviceId} not found`);
    });

    it('carries the identifier it received, and not a fixed one', () => {
        expect(new ServiceNotFoundError('another-id').message).toBe('Service another-id not found');
    });

    it('chains the original error through the cause option', () => {
        const original = new Error('connection lost');

        expect(new ServiceNotFoundError(serviceId, { cause: original }).cause).toBe(original);
    });
});

describe('ServiceNameTakenError', () => {
    const projectId = 'b2a2132b-d6b7-464a-8aaf-c659a3ca0d60';

    it('is a DomainError', () => {
        expect(new ServiceNameTakenError(projectId, 'api')).toBeInstanceOf(DomainError);
    });

    it('sets its name to ServiceNameTakenError', () => {
        expect(new ServiceNameTakenError(projectId, 'api').name).toBe('ServiceNameTakenError');
    });

    it('carries the SERVICE_NAME_TAKEN code', () => {
        expect(new ServiceNameTakenError(projectId, 'api').code).toBe('SERVICE_NAME_TAKEN');
    });

    it('builds a message carrying the name and the project', () => {
        expect(new ServiceNameTakenError(projectId, 'api').message).toBe(
            `Service api already exists in project ${projectId}`,
        );
    });

    it('chains the original error through the cause option', () => {
        const original = new Error('duplicate key');

        expect(new ServiceNameTakenError(projectId, 'api', { cause: original }).cause).toBe(original);
    });
});
