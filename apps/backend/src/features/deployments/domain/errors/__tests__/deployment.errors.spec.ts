import { ServiceNotDeployableError } from '../deployment.errors';

import { DomainError } from '@core/domain/errors/domain.error';

describe('ServiceNotDeployableError', () => {
    it('is an Error', () => {
        expect(new ServiceNotDeployableError()).toBeInstanceOf(Error);
    });

    it('is a DomainError', () => {
        expect(new ServiceNotDeployableError()).toBeInstanceOf(DomainError);
    });

    it('sets its name to ServiceNotDeployableError', () => {
        expect(new ServiceNotDeployableError().name).toBe('ServiceNotDeployableError');
    });

    it('carries the SERVICE_NOT_DEPLOYABLE code', () => {
        expect(new ServiceNotDeployableError().code).toBe('SERVICE_NOT_DEPLOYABLE');
    });

    it('explains what the service is missing', () => {
        expect(new ServiceNotDeployableError().message)
            .toBe('Service has no repository or deployment branch configured');
    });

    it('chains the original error through the cause option', () => {
        const original = new Error('service read failed');

        expect(new ServiceNotDeployableError({ cause: original }).cause).toBe(original);
    });
});
