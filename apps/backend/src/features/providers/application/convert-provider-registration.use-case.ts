import {
    ProviderRegistrationNotFoundError,
    ProviderRegistrationStepError,
} from '../domain/errors/provider-registration.errors';
import { ProviderRegistration, ProviderRegistrationStep } from '../domain/models/provider-registration.models';
import { ProviderClient } from '../domain/ports/provider-client.port';
import { ProviderRegistrationsRepository } from '../domain/repositories/provider-registrations.repository';

import { getActiveProviderRegistrationUseCase } from './get-active-provider-registration.use-case';

/**
 * Use case that converts the temporary code of a manifest into the configuration
 * of the created application.
 *
 * @param registrationsRepository Provider registrations repository
 * @param providerClient Provider client port
 * @param state State of the registration
 * @param code Temporary code GitHub handed back with the creation of the application
 * @param now Moment the life of the registration is judged against
 *
 * @returns The pending registration at the step `awaiting_installation`
 *
 * @throws ProviderRegistrationNotFoundError When no row carries the state
 * @throws ProviderRegistrationExpiredError When the row passed the date of the end of its life
 * @throws ProviderRegistrationStepError When the row is not at the step `awaiting_creation`
 */
export async function convertProviderRegistrationUseCase(
    registrationsRepository: ProviderRegistrationsRepository,
    providerClient: ProviderClient,
    state: string,
    code: string,
    now: Date = new Date(),
): Promise<ProviderRegistration> {
    const registration = await getActiveProviderRegistrationUseCase(registrationsRepository, state, now);

    if (registration.step !== ProviderRegistrationStep.AwaitingCreation) {
        throw new ProviderRegistrationStepError(state, ProviderRegistrationStep.AwaitingCreation, registration.step);
    }

    const conversion = await providerClient.convertAppManifest(code);

    const converted = await registrationsRepository.saveConversion(state, conversion);

    if (!converted) {
        throw new ProviderRegistrationNotFoundError(state);
    }

    return converted;
}
