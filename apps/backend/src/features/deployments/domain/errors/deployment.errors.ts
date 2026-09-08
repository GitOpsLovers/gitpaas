import { DomainError } from '@core/domain/errors/domain.error';

/**
 * Raised whenever an operation targets a deployment that does not exist.
 */
export class DeploymentNotFoundError extends DomainError {
    constructor(deploymentId: string, options?: ErrorOptions) {
        super('DEPLOYMENT_NOT_FOUND', `Deployment ${deploymentId} not found`, options);
    }
}

/**
 * Raised when a deployment is triggered for a service that lacks the configuration required to deploy it.
 */
export class ServiceNotDeployableError extends DomainError {
    constructor(options?: ErrorOptions) {
        super(
            'SERVICE_NOT_DEPLOYABLE',
            'Service has no provider, repository or deployment branch configured',
            options,
        );
    }
}

/**
 * Raised when the provider of a service cannot reach the repository the service stores.
 *
 * A repository identifier is global at GitHub, and the access to it is not: a service
 * that keeps a repository of another account can never be deployed.
 */
export class ProviderRepositoryUnreachableError extends DomainError {
    constructor(providerId: string, repositoryId: string, options?: ErrorOptions) {
        super(
            'PROVIDER_REPOSITORY_UNREACHABLE',
            `Provider ${providerId} cannot reach repository ${repositoryId}`,
            options,
        );
    }
}
