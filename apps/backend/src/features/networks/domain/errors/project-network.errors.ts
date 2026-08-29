import { DomainError } from '@core/domain/errors/domain.error';

/**
 * Raised whenever an operation targets a network that the project does not hold.
 */
export class ProjectNetworkNotFoundError extends DomainError {
    constructor(networkId: string, options?: ErrorOptions) {
        super('PROJECT_NETWORK_NOT_FOUND', `Network ${networkId} not found`, options);
    }
}

/**
 * Raised whenever a network name is already used inside the same project.
 */
export class ProjectNetworkNameTakenError extends DomainError {
    constructor(projectId: string, name: string, options?: ErrorOptions) {
        super('PROJECT_NETWORK_NAME_TAKEN', `Network ${name} already exists in project ${projectId}`, options);
    }
}

/**
 * Raised whenever the removal of a network targets a network that a container still holds.
 */
export class ProjectNetworkInUseError extends DomainError {
    constructor(name: string, options?: ErrorOptions) {
        super('PROJECT_NETWORK_IN_USE', `Network ${name} is still held by a container`, options);
    }
}
