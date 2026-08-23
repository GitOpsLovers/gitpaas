import type { SetServiceVariableDto, UpdateServiceVariableDto } from '@gitpaas/contracts';
import { Inject, Injectable } from '@nestjs/common';

import { getServiceVariablesByServiceUseCase } from '../../application/get-service-variables-by-service.use-case';
import { removeServiceVariableUseCase } from '../../application/remove-service-variable.use-case';
import { setServiceVariableUseCase } from '../../application/set-service-variable.use-case';
import { updateServiceVariableUseCase } from '../../application/update-service-variable.use-case';
import { ServiceVariable } from '../../domain/models/service-variable.models';
import type { ServiceVariablesRepository } from '../../domain/repositories/service-variables.repository';
import { DatabaseServiceVariablesRepository } from '../../infrastructure/database/db-service-variables.repository';

import type { SecretCipher } from '@core/domain/ports/secret-cipher.port';
import { SecretCipherAdapter } from '@core/infrastructure/crypto/secret-cipher.adapter';

/**
 * Service variables service
 */
@Injectable()
export class ServiceVariablesService {
    constructor(
        @Inject(DatabaseServiceVariablesRepository)
        private readonly repository: ServiceVariablesRepository,
        @Inject(SecretCipherAdapter)
        private readonly cipher: SecretCipher,
    ) {}

    public getByService(serviceId: string): Promise<ServiceVariable[]> {
        return getServiceVariablesByServiceUseCase(this.repository, serviceId);
    }

    public set(serviceId: string, setDto: SetServiceVariableDto): Promise<ServiceVariable> {
        return setServiceVariableUseCase(this.repository, this.cipher, serviceId, setDto);
    }

    public update(
        serviceId: string,
        id: string,
        updateDto: UpdateServiceVariableDto,
    ): Promise<ServiceVariable> {
        return updateServiceVariableUseCase(this.repository, this.cipher, serviceId, id, updateDto);
    }

    public remove(serviceId: string, id: string): Promise<void> {
        return removeServiceVariableUseCase(this.repository, serviceId, id);
    }
}
