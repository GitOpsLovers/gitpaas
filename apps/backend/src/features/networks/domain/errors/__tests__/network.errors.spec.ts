import { ServiceNotFoundError } from '../network.errors';

import { ServiceNotFoundError as ContainerServiceNotFoundError } from '@features/containers/domain/errors/container.errors';

const serviceId = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

describe('ServiceNotFoundError', () => {
    it('is an Error', () => {
        expect(new ServiceNotFoundError(serviceId)).toBeInstanceOf(Error);
    });

    it('sets its name to ServiceNotFoundError', () => {
        expect(new ServiceNotFoundError(serviceId).name).toBe('ServiceNotFoundError');
    });

    it('builds a message carrying the service identifier', () => {
        expect(new ServiceNotFoundError(serviceId).message).toBe(`Service ${serviceId} not found`);
    });

    it('carries the identifier it received, and not a fixed one', () => {
        expect(new ServiceNotFoundError('another-id').message).toBe('Service another-id not found');
    });

    it('is never an instance of the containers error of the same name', () => {
        expect(new ServiceNotFoundError(serviceId)).not.toBeInstanceOf(ContainerServiceNotFoundError);
    });
});
