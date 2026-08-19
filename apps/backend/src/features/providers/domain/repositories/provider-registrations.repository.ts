import {
    NewProviderRegistration,
    ProviderRegistration,
    ProviderRegistrationCompletion,
    ProviderRegistrationConversion,
} from '../models/provider-registration.models';
import { Provider } from '../models/provider.models';

/**
 * Provider registrations repository
 */
export interface ProviderRegistrationsRepository {
    /**
     * Gets the pending registration a state names
     *
     * @param state State of the registration
     *
     * @returns Pending registration, or `null` when no row carries the state
     */
    findByState: (state: string) => Promise<ProviderRegistration | null>;

    /**
     * Writes a pending registration at the step `awaiting_creation`
     *
     * @param newRegistration Data the registration starts with
     *
     * @returns Created pending registration
     */
    create: (newRegistration: NewProviderRegistration) => Promise<ProviderRegistration>;

    /**
     * Writes the configuration of the created application into a pending registration.
     *
     * @param state State of the registration
     * @param conversion Configuration of the application GitHub answered with
     *
     * @returns Updated pending registration, or `null` when no row carries the state
     */
    saveConversion: (state: string, conversion: ProviderRegistrationConversion) => Promise<ProviderRegistration | null>;

    /**
     * Writes one provider from a pending registration, and removes that registration.
     *
     * @param state State of the registration
     * @param completion Data the provider is written from, with the key already sealed
     *
     * @returns Created provider
     */
    complete: (state: string, completion: ProviderRegistrationCompletion) => Promise<Provider>;

    /**
     * Removes every pending registration that passed the date of the end of its life
     *
     * @param now Moment the removal is judged against
     *
     * @returns Number of rows that were removed
     */
    deleteExpired: (now: Date) => Promise<number>;
}
