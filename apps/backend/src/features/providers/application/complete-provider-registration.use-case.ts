import { ProviderRegistrationStepError } from '../domain/errors/provider-registration.errors';
import { ProviderNameTakenError } from '../domain/errors/provider.errors';
import { ProviderRegistration, ProviderRegistrationStep } from '../domain/models/provider-registration.models';
import { Provider } from '../domain/models/provider.models';
import { ProviderRegistrationsRepository } from '../domain/repositories/provider-registrations.repository';
import { ProvidersRepository } from '../domain/repositories/providers.repository';

import { getActiveProviderRegistrationUseCase } from './get-active-provider-registration.use-case';

/**
 * Refuses a pending registration that does not carry the configuration of a created application.
 *
 * @param registration Pending registration the provider is written from
 *
 * @returns The identifier of the application and its sealed private key
 *
 * @throws ProviderRegistrationStepError When the row is not at the step `awaiting_installation`
 */
function readCreatedApp(registration: ProviderRegistration): { appId: string; encryptedPrivateKey: string } {
    const { step, appId, encryptedPrivateKey } = registration;

    if (step !== ProviderRegistrationStep.AwaitingInstallation || !appId || !encryptedPrivateKey) {
        throw new ProviderRegistrationStepError(
            registration.state,
            ProviderRegistrationStep.AwaitingInstallation,
            step,
        );
    }

    return { appId, encryptedPrivateKey };
}

/**
 * Use case that ends the registration of a GitHub App the platform created.
 *
 * @param providersRepository Providers repository
 * @param registrationsRepository Provider registrations repository
 * @param state State of the registration
 * @param installationId Identifier of the installation GitHub handed back
 * @param now Moment the life of the registration is judged against
 *
 * @returns Created provider
 *
 * @throws ProviderRegistrationNotFoundError When no row carries the state
 * @throws ProviderRegistrationExpiredError When the row passed the date of the end of its life
 * @throws ProviderRegistrationStepError When the row is not at the step `awaiting_installation`
 * @throws ProviderNameTakenError When another provider took the name in the meantime
 */
export async function completeProviderRegistrationUseCase(
    providersRepository: ProvidersRepository,
    registrationsRepository: ProviderRegistrationsRepository,
    state: string,
    installationId: string,
    now: Date = new Date(),
): Promise<Provider> {
    const registration = await getActiveProviderRegistrationUseCase(registrationsRepository, state, now);

    const { appId, encryptedPrivateKey } = readCreatedApp(registration);

    const existing = await providersRepository.findByName(registration.name);

    if (existing) {
        throw new ProviderNameTakenError(registration.name);
    }

    return registrationsRepository.complete(state, {
        name: registration.name,
        appId,
        installationId,
        encryptedPrivateKey,
    });
}
