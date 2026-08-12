import { DomainError } from '@core/domain/errors/domain.error';

/**
 * Raised whenever an operation targets a project that does not exist.
 */
export class ProjectNotFoundError extends DomainError {
    constructor(projectId: string, options?: ErrorOptions) {
        super('PROJECT_NOT_FOUND', `Project ${projectId} not found`, options);
    }
}
