import { ProviderRegistrationStep } from '../models/provider-registration.models';

import { DomainError } from '@core/domain/errors/domain.error';

/**
 * Raised whenever an operation names a state that no pending registration carries.
 */
export class ProviderRegistrationNotFoundError extends DomainError {
    constructor(state: string, options?: ErrorOptions) {
        super('PROVIDER_REGISTRATION_NOT_FOUND', `Provider registration ${state} not found`, options);
    }
}

/**
 * Raised whenever an operation targets a pending registration that passed the date of the end of its life.
 */
export class ProviderRegistrationExpiredError extends DomainError {
    constructor(state: string, options?: ErrorOptions) {
        super('PROVIDER_REGISTRATION_EXPIRED', `Provider registration ${state} has expired`, options);
    }
}

/**
 * Raised whenever an operation targets a pending registration that stands at
 * another step than the one the operation needs.
 */
export class ProviderRegistrationStepError extends DomainError {
    constructor(
        state: string,
        expected: ProviderRegistrationStep,
        actual: ProviderRegistrationStep,
        options?: ErrorOptions,
    ) {
        super(
            'PROVIDER_REGISTRATION_STEP_CONFLICT',
            `Provider registration ${state} is at the step ${actual}, and the operation needs the step ${expected}`,
            options,
        );
    }
}
