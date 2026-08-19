import { ProviderRegistrationsRepository } from '../domain/repositories/provider-registrations.repository';

/**
 * Removes every pending registration that passed the date of the end of its life.
 *
 * @param repository Provider registrations repository
 * @param now Moment the removal is judged against
 *
 * @returns Number of pending registrations that were removed
 */
export async function removeExpiredProviderRegistrationsUseCase(
    repository: ProviderRegistrationsRepository,
    now: Date,
): Promise<number> {
    return repository.deleteExpired(now);
}
