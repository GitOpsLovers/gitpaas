import { DomainError } from '@core/domain/errors/domain.error';

/**
 * Raised whenever an operation targets a project that does not exist.
 */
export class ProjectNotFoundError extends DomainError {
    constructor(projectId: string, options?: ErrorOptions) {
        super('PROJECT_NOT_FOUND', `Project ${projectId} not found`, options);
    }
}

/**
 * Raised whenever a project name is already used inside the same namespace.
 */
export class ProjectNameTakenError extends DomainError {
    constructor(namespaceId: string, name: string, options?: ErrorOptions) {
        super('PROJECT_NAME_TAKEN', `Project ${name} already exists in namespace ${namespaceId}`, options);
    }
}
