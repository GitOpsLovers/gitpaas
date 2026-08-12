import { DomainError } from '@core/domain/errors/domain.error';

/**
 * Raised whenever an operation targets a project that does not exist. It is the
 * single definition of that failure: the features that hang off a project (the
 * services, today) raise this very class.
 */
export class ProjectNotFoundError extends DomainError {
    /**
     * @param projectId Identifier of the project that could not be found
     * @param options Standard error options, so `{ cause }` chains the original error
     */
    constructor(projectId: string, options?: ErrorOptions) {
        super('PROJECT_NOT_FOUND', `Project ${projectId} not found`, options);
    }
}
