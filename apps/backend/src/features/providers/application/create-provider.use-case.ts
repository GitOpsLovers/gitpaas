import type { CreateProviderDto } from '@gitpaas/contracts';

import { ProviderNameTakenError } from '../domain/errors/provider.errors';
import { Provider } from '../domain/models/provider.models';
import { ProvidersRepository } from '../domain/repositories/providers.repository';

import type { SecretCipher } from '@core/domain/ports/secret-cipher.port';

/**
 * Use case for registering a new provider, sealing its private key before the row is written.
 *
 * @param repository Providers repository
 * @param cipher Secret cipher
 * @param createDto Provider data
 *
 * @returns Created provider
 *
 * @throws ProviderNameTakenError When another provider already carries the name
 */
export async function createProviderUseCase(
    repository: ProvidersRepository,
    cipher: SecretCipher,
    createDto: CreateProviderDto,
): Promise<Provider> {
    const existing = await repository.findByName(createDto.name);

    if (existing) {
        throw new ProviderNameTakenError(createDto.name);
    }

    return repository.create(createDto, cipher.encryptSecret(createDto.privateKey));
}
