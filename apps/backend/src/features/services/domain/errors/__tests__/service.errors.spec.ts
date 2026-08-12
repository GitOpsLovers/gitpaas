import { ServiceNotFoundError } from '../service.errors';

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
