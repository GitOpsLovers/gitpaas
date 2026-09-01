import { DomainError } from '@core/domain/errors/domain.error';

/**
 * Raised when a route of the administration names a user that does not exist.
 */
export class UserNotFoundError extends DomainError {
    constructor(id: string, options?: ErrorOptions) {
        super('USER_NOT_FOUND', `User "${id}" not found`, options);
    }
}
