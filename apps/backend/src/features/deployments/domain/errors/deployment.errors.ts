import { DomainError } from '@core/domain/errors/domain.error';

/**
 * Raised when a deployment is triggered for a service that lacks the
 * configuration required to deploy it (a repository and a deployment branch).
 */
export class ServiceNotDeployableError extends DomainError {
    /**
     * @param options Standard error options, so `{ cause }` chains the original error
     */
    constructor(options?: ErrorOptions) {
        super('SERVICE_NOT_DEPLOYABLE', 'Service has no repository or deployment branch configured', options);
    }
}
