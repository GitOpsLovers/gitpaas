import type { UpdateServiceVariableDto } from '@gitpaas/contracts';

import {
    ServiceVariableNameTakenError,
    ServiceVariableNotFoundError,
} from '../domain/errors/service-variable.errors';
import { ServiceVariable } from '../domain/models/service-variable.models';
import { ServiceVariablesRepository } from '../domain/repositories/service-variables.repository';

import type { SecretCipher } from '@core/domain/ports/secret-cipher.port';

/**
 * Builds the value the row must store for a change.
 *
 * @param cipher Secret cipher
 * @param serviceId Service the variable belongs to, which binds the sealed value to it
 * @param secret `true` when the variable is a secret
 * @param value Value the body carries
 *
 * @returns The value the row stores, or `undefined` to keep the stored one
 */
function resolveStoredValue(
    cipher: SecretCipher,
    serviceId: string,
    secret: boolean,
    value?: string,
): string | undefined {
    if (value === undefined) {
        return undefined;
    }

    if (secret) {
        return value ? cipher.encryptSecret(value, serviceId) : undefined;
    }

    return value;
}

/**
 * Use case for changing a variable of a service.
 *
 * @param repository Service variables repository
 * @param cipher Secret cipher
 * @param serviceId Service the variable belongs to
 * @param id Variable id
 * @param updateDto Variable data
 *
 * @returns Updated variable
 *
 * @throws ServiceVariableNotFoundError When the service holds no variable of that id
 * @throws ServiceVariableNameTakenError When the service already holds the new name
 */
export async function updateServiceVariableUseCase(
    repository: ServiceVariablesRepository,
    cipher: SecretCipher,
    serviceId: string,
    id: string,
    updateDto: UpdateServiceVariableDto,
): Promise<ServiceVariable> {
    const variable = await repository.findById(id);

    if (variable?.serviceId !== serviceId) {
        throw new ServiceVariableNotFoundError(id);
    }

    if (updateDto.name && updateDto.name !== variable.name) {
        const existing = await repository.findByName(serviceId, updateDto.name);

        if (existing) {
            throw new ServiceVariableNameTakenError(updateDto.name, serviceId);
        }
    }

    const updated = await repository.update(
        id,
        updateDto,
        resolveStoredValue(cipher, serviceId, variable.secret, updateDto.value),
    );

    if (!updated) {
        throw new ServiceVariableNotFoundError(id);
    }

    return updated;
}
