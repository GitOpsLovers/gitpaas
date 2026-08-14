import { DomainError } from '@core/domain/errors/domain.error';

/**
 * Raised whenever an operation targets a namespace that does not exist.
 */
export class NamespaceNotFoundError extends DomainError {
    constructor(namespaceId: string, options?: ErrorOptions) {
        super('NAMESPACE_NOT_FOUND', `Namespace ${namespaceId} not found`, options);
    }
}

/**
 * Raised whenever a namespace that still holds projects is deleted.
 */
export class NamespaceNotEmptyError extends DomainError {
    constructor(namespaceId: string, projectsCount: number, options?: ErrorOptions) {
        super(
            'NAMESPACE_NOT_EMPTY',
            `Namespace ${namespaceId} still has ${projectsCount} project(s) attached`,
            options,
        );
    }
}
