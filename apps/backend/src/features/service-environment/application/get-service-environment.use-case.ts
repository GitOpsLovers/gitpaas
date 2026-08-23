import { ServiceVariableNotDecryptableError } from '../domain/errors/service-variable.errors';
import { ServiceVariablesRepository } from '../domain/repositories/service-variables.repository';

import type { SecretCipher } from '@core/domain/ports/secret-cipher.port';

/**
 * Use case for reading the environment a service gives to its containers.
 *
 * @param repository Service variables repository
 * @param cipher Secret cipher
 * @param serviceId Service the variables belong to
 *
 * @returns The name and the clear value of every variable of the service
 *
 * @throws ServiceVariableNotDecryptableError When the key of the encryption does not open a secret
 */
export async function getServiceEnvironmentUseCase(
    repository: ServiceVariablesRepository,
    cipher: SecretCipher,
    serviceId: string,
): Promise<Record<string, string>> {
    const variables = await repository.getStoredByService(serviceId);

    const entries = variables.map((variable): [string, string] => {
        if (!variable.secret) {
            return [variable.name, variable.storedValue];
        }

        try {
            return [variable.name, cipher.decryptSecret(variable.storedValue)];
        } catch (error) {
            throw new ServiceVariableNotDecryptableError(variable.name, { cause: error });
        }
    });

    return Object.fromEntries(entries);
}
