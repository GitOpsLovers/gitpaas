import {
    ProviderRegistrationExpiredError,
    ProviderRegistrationNotFoundError,
} from '../domain/errors/provider-registration.errors';
import { ProviderRegistration } from '../domain/models/provider-registration.models';
import { ProviderRegistrationsRepository } from '../domain/repositories/provider-registrations.repository';

/**
 * Reads the pending registration a state names, and refuses one that passed the
 * date of the end of its life.
 *
 * @param repository Provider registrations repository
 * @param state State of the registration
 * @param now Moment the life of the registration is judged against
 *
 * @returns The pending registration that still lives
 *
 * @throws ProviderRegistrationNotFoundError When no row carries the state
 * @throws ProviderRegistrationExpiredError When the row passed the date of the end of its life
 */
export async function getActiveProviderRegistrationUseCase(
    repository: ProviderRegistrationsRepository,
    state: string,
    now: Date,
): Promise<ProviderRegistration> {
    const registration = await repository.findByState(state);

    if (!registration) {
        throw new ProviderRegistrationNotFoundError(state);
    }

    if (registration.expiresAt.getTime() <= now.getTime()) {
        throw new ProviderRegistrationExpiredError(state);
    }

    return registration;
}
