import type { SetServiceVariableDto } from '@gitpaas/contracts';

import { ServiceVariableNameTakenError } from '../domain/errors/service-variable.errors';
import { ServiceVariable } from '../domain/models/service-variable.models';
import { ServiceVariablesRepository } from '../domain/repositories/service-variables.repository';

import type { SecretCipher } from '@core/domain/ports/secret-cipher.port';

/**
 * Use case for setting a variable of a service.
 *
 * @param repository Service variables repository
 * @param cipher Secret cipher
 * @param serviceId Service the variable belongs to
 * @param setDto Variable data
 *
 * @returns Created variable
 *
 * @throws ServiceVariableNameTakenError When the service already holds the name
 */
export async function setServiceVariableUseCase(
    repository: ServiceVariablesRepository,
    cipher: SecretCipher,
    serviceId: string,
    setDto: SetServiceVariableDto,
): Promise<ServiceVariable> {
    const existing = await repository.findByName(serviceId, setDto.name);

    if (existing) {
        throw new ServiceVariableNameTakenError(setDto.name, serviceId);
    }

    const secret = setDto.secret ?? false;
    const storedValue = secret && setDto.value ? cipher.encryptSecret(setDto.value) : setDto.value;

    return repository.create(serviceId, setDto, storedValue);
}
