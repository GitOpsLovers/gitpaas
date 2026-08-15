import { Provider } from '../domain/models/provider.models';
import { ProvidersRepository } from '../domain/repositories/providers.repository';

/**
 * Use case for finding a provider by its id.
 *
 * @param repository Providers repository
 * @param id Provider id
 *
 * @returns Provider, or `null` when it does not exist
 */
export function findProviderByIdUseCase(repository: ProvidersRepository, id: string): Promise<Provider | null> {
    return repository.findById(id);
}
