import { DomainError } from '@core/domain/errors/domain.error';

/**
 * Raised whenever an operation targets a service that does not exist. It is the
 * single definition of that failure: the features that work on a service
 * (containers, networks, deployments) raise this very class.
 */
export class ServiceNotFoundError extends DomainError {
    /**
     * @param serviceId Identifier of the service that could not be found
     * @param options Standard error options, so `{ cause }` chains the original error
     */
    constructor(serviceId: string, options?: ErrorOptions) {
        super('SERVICE_NOT_FOUND', `Service ${serviceId} not found`, options);
    }
}
