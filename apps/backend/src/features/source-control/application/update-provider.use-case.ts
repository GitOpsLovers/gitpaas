import { UpdateProviderDto } from '../domain/dtos/update-provider.dto';
import { ProviderNameTakenError } from '../domain/errors/provider.errors';
import { Provider } from '../domain/models/provider.models';
import { ProvidersRepository } from '../domain/repositories/providers.repository';

import type { SecretCipher } from '@core/domain/ports/secret-cipher.port';

/**
 * Use case for changing a provider.
 *
 * An absent or empty private key keeps the stored one, so an operator changes the
 * name of a provider without the PEM at hand.
 *
 * @param repository Providers repository
 * @param cipher Secret cipher
 * @param id Provider id
 * @param updateDto Provider data
 *
 * @returns Updated provider, or `null` when it does not exist
 *
 * @throws ProviderNameTakenError When another provider already carries the name
 */
export async function updateProviderUseCase(
    repository: ProvidersRepository,
    cipher: SecretCipher,
    id: string,
    updateDto: UpdateProviderDto,
): Promise<Provider | null> {
    if (updateDto.name) {
        const existing = await repository.findByName(updateDto.name);

        if (existing && existing.id !== id) {
            throw new ProviderNameTakenError(updateDto.name);
        }
    }

    const privateKey = updateDto.privateKey?.trim();
    const encryptedPrivateKey = privateKey ? cipher.encryptSecret(privateKey) : undefined;

    return repository.update(id, updateDto, encryptedPrivateKey);
}
