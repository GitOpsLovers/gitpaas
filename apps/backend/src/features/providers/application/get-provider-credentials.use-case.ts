import { ProviderNotFoundError } from '../domain/errors/provider.errors';
import { ProviderCredentials } from '../domain/models/provider.models';
import { ProvidersRepository } from '../domain/repositories/providers.repository';

/**
 * Use case for loading the credentials a provider gives to the provider client.
 *
 * @param repository Providers repository
 * @param id Provider id
 *
 * @returns Credentials of the provider, with the private key in clear text
 *
 * @throws ProviderNotFoundError When the provider does not exist
 */
export async function getProviderCredentialsUseCase(
    repository: ProvidersRepository,
    id: string,
): Promise<ProviderCredentials> {
    const credentials = await repository.getCredentials(id);

    if (!credentials) {
        throw new ProviderNotFoundError(id);
    }

    return credentials;
}
