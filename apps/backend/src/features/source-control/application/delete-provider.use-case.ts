import { ProviderInUseError } from '../domain/errors/provider.errors';
import { ProvidersRepository } from '../domain/repositories/providers.repository';

/**
 * Use case for deleting a provider, refusing the deletion while a service still
 * points at it.
 *
 * @param repository Providers repository
 * @param id Provider id
 *
 * @returns `true` when a row was deleted, `false` otherwise
 *
 * @throws ProviderInUseError When services still point at the provider
 */
export async function deleteProviderUseCase(repository: ProvidersRepository, id: string): Promise<boolean> {
    const servicesCount = await repository.countServices(id);

    if (servicesCount > 0) {
        throw new ProviderInUseError(id, servicesCount);
    }

    return repository.delete(id);
}
