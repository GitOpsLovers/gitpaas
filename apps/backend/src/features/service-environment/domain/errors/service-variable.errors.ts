import { DomainError } from '@core/domain/errors/domain.error';

/**
 * Raised whenever an operation targets a variable that the service does not hold.
 */
export class ServiceVariableNotFoundError extends DomainError {
    constructor(variableId: string, options?: ErrorOptions) {
        super('VARIABLE_NOT_FOUND', `Variable ${variableId} not found`, options);
    }
}

/**
 * Raised whenever a name is already in use inside the same service.
 */
export class ServiceVariableNameTakenError extends DomainError {
    constructor(name: string, serviceId: string, options?: ErrorOptions) {
        super('VARIABLE_NAME_TAKEN', `Variable ${name} already exists in service ${serviceId}`, options);
    }
}

/**
 * Raised whenever the value of a secret cannot be opened with the key of the encryption.
 */
export class ServiceVariableNotDecryptableError extends DomainError {
    constructor(name: string, options?: ErrorOptions) {
        super('VARIABLE_NOT_DECRYPTABLE', `The secret ${name} cannot be decrypted`, options);
    }
}
