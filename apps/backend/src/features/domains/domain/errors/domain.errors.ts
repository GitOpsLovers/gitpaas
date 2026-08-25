import { DomainError } from '@core/domain/errors/domain.error';

/**
 * Raised whenever an operation targets a domain that does not exist.
 */
export class DomainNotFoundError extends DomainError {
    constructor(domainId: string, options?: ErrorOptions) {
        super('DOMAIN_NOT_FOUND', `Domain ${domainId} not found`, options);
    }
}

/**
 * Raised whenever a host is already claimed, because one host belongs to one service alone.
 */
export class DomainTakenError extends DomainError {
    constructor(host: string, options?: ErrorOptions) {
        super('DOMAIN_TAKEN', `Domain ${host} is already claimed`, options);
    }
}
