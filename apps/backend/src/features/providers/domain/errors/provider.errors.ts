import { DomainError } from '@core/domain/errors/domain.error';

/**
 * Raised whenever an operation targets a provider that does not exist.
 */
export class ProviderNotFoundError extends DomainError {
    constructor(providerId: string, options?: ErrorOptions) {
        super('PROVIDER_NOT_FOUND', `Provider ${providerId} not found`, options);
    }
}

/**
 * Raised whenever a provider takes a name that another provider already carries.
 */
export class ProviderNameTakenError extends DomainError {
    constructor(name: string, options?: ErrorOptions) {
        super('PROVIDER_NAME_TAKEN', `Provider name ${name} is already taken`, options);
    }
}

/**
 * Raised whenever a provider that services still point at is deleted.
 */
export class ProviderInUseError extends DomainError {
    constructor(providerId: string, servicesCount: number, options?: ErrorOptions) {
        super('PROVIDER_IN_USE', `Provider ${providerId} is still used by ${servicesCount} service(s)`, options);
    }
}
