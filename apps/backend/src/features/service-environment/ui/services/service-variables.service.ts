import type { SetServiceVariableDto, UpdateServiceVariableDto } from '@gitpaas/contracts';
import { Inject, Injectable } from '@nestjs/common';

import { getServiceVariablesByServiceUseCase } from '../../application/get-service-variables-by-service.use-case';
import { removeServiceVariableUseCase } from '../../application/remove-service-variable.use-case';
import { setServiceVariableUseCase } from '../../application/set-service-variable.use-case';
import { updateServiceVariableUseCase } from '../../application/update-service-variable.use-case';
import { ServiceVariable, ServiceVariableRow } from '../../domain/models/service-variable.models';
import type { ComposeEnvironmentCacheStore } from '../../domain/ports/compose-environment-cache-store.port';
import type { ServiceVariablesRepository } from '../../domain/repositories/service-variables.repository';
import { DatabaseComposeEnvironmentCacheAdapter } from '../../infrastructure/database/db-compose-environment-cache.adapter';
import { DatabaseServiceVariablesRepository } from '../../infrastructure/database/db-service-variables.repository';

import { SECURITY_ACTION_SECRET_CHANGE } from '@core/domain/constants/telemetry.constants';
import type { SecretCipher } from '@core/domain/ports/secret-cipher.port';
import { SecretCipherAdapter } from '@core/infrastructure/crypto/secret-cipher.adapter';
import { recordSecurityAction } from '@core/infrastructure/telemetry/record-security-action';

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
        @Inject(DatabaseComposeEnvironmentCacheAdapter)
        private readonly cacheStore: ComposeEnvironmentCacheStore,
    ) {}

    public getByService(serviceId: string): Promise<ServiceVariableRow[]> {
        return getServiceVariablesByServiceUseCase(this.repository, this.cacheStore, serviceId);
    }

    public set(serviceId: string, setDto: SetServiceVariableDto): Promise<ServiceVariable> {
        recordSecurityAction(SECURITY_ACTION_SECRET_CHANGE);

        return setServiceVariableUseCase(this.repository, this.cipher, serviceId, setDto);
    }

    public update(
        serviceId: string,
        id: string,
        updateDto: UpdateServiceVariableDto,
    ): Promise<ServiceVariable> {
        recordSecurityAction(SECURITY_ACTION_SECRET_CHANGE);

        return updateServiceVariableUseCase(this.repository, this.cipher, this.cacheStore, serviceId, id, updateDto);
    }

    public remove(serviceId: string, id: string): Promise<void> {
        recordSecurityAction(SECURITY_ACTION_SECRET_CHANGE);

        return removeServiceVariableUseCase(this.repository, this.cacheStore, serviceId, id);
    }
}
