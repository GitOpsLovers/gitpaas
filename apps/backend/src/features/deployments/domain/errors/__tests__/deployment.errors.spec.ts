import { DeploymentNotFoundError, ServiceNotDeployableError } from '../deployment.errors';

import { DomainError } from '@core/domain/errors/domain.error';

describe('DeploymentNotFoundError', () => {
    const deploymentId = 'c1a2b3c4-d5e6-47f8-9a0b-1c2d3e4f5a6b';

    it('is an Error', () => {
        expect(new DeploymentNotFoundError(deploymentId)).toBeInstanceOf(Error);
    });

    it('is a DomainError', () => {
        expect(new DeploymentNotFoundError(deploymentId)).toBeInstanceOf(DomainError);
    });

    it('sets its name to DeploymentNotFoundError', () => {
        expect(new DeploymentNotFoundError(deploymentId).name).toBe('DeploymentNotFoundError');
    });

    it('carries the DEPLOYMENT_NOT_FOUND code', () => {
        expect(new DeploymentNotFoundError(deploymentId).code).toBe('DEPLOYMENT_NOT_FOUND');
    });

    it('builds a message carrying the deployment identifier', () => {
        expect(new DeploymentNotFoundError(deploymentId).message).toBe(`Deployment ${deploymentId} not found`);
    });

    it('carries the identifier it received, and not a fixed one', () => {
        expect(new DeploymentNotFoundError('another-id').message).toBe('Deployment another-id not found');
    });

    it('chains the original error through the cause option', () => {
        const original = new Error('connection lost');

        expect(new DeploymentNotFoundError(deploymentId, { cause: original }).cause).toBe(original);
    });
});

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
            .toBe('Service has no provider, repository or deployment branch configured');
    });

    it('chains the original error through the cause option', () => {
        const original = new Error('service read failed');

        expect(new ServiceNotDeployableError({ cause: original }).cause).toBe(original);
    });
});
