import { Provider } from '../domain/models/provider.models';
import { ProvidersRepository } from '../domain/repositories/providers.repository';

/**
 * Use case for retrieving all providers.
 *
 * @param repository Providers repository
 *
 * @returns All providers
 */
export function getAllProvidersUseCase(repository: ProvidersRepository): Promise<Provider[]> {
    return repository.getAll();
}
