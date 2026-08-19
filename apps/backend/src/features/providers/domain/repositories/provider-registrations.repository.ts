import {
    NewProviderRegistration,
    ProviderRegistration,
    ProviderRegistrationConversion,
} from '../models/provider-registration.models';

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
     * Removes every pending registration that passed the date of the end of its life
     *
     * @param now Moment the removal is judged against
     *
     * @returns Number of rows that were removed
     */
    deleteExpired: (now: Date) => Promise<number>;
}
