import { DomainError } from '@core/domain/errors/domain.error';

/**
 * Raised whenever an operation targets a service that does not exist.
 */
export class ServiceNotFoundError extends DomainError {
    constructor(serviceId: string, options?: ErrorOptions) {
        super('SERVICE_NOT_FOUND', `Service ${serviceId} not found`, options);
    }
}
