import { DomainError } from '@core/domain/errors/domain.error';

/**
 * Raised whenever an operation targets a service that does not exist.
 */
export class ServiceNotFoundError extends DomainError {
    constructor(serviceId: string, options?: ErrorOptions) {
        super('SERVICE_NOT_FOUND', `Service ${serviceId} not found`, options);
    }
}

/**
 * Raised whenever a service name is already used inside the same project.
 */
export class ServiceNameTakenError extends DomainError {
    constructor(projectId: string, name: string, options?: ErrorOptions) {
        super('SERVICE_NAME_TAKEN', `Service ${name} already exists in project ${projectId}`, options);
    }
}
