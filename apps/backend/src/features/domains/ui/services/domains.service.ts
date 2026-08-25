import type { ClaimDomainDto, UpdateDomainDto } from '@gitpaas/contracts';
import { Inject, Injectable } from '@nestjs/common';

import { claimDomainUseCase } from '../../application/claim-domain.use-case';
import { getDomainsByServiceUseCase } from '../../application/get-domains-by-service.use-case';
import { removeDomainUseCase } from '../../application/remove-domain.use-case';
import { updateDomainUseCase } from '../../application/update-domain.use-case';
import { Domain } from '../../domain/models/domain.models';
import type { DomainsRepository } from '../../domain/repositories/domains.repository';
import { DatabaseDomainsRepository } from '../../infrastructure/database/db-domains.repository';

/**
 * Domains service
 */
@Injectable()
export class DomainsService {
    constructor(
        @Inject(DatabaseDomainsRepository)
        private readonly repository: DomainsRepository,
    ) {}

    public getByService(serviceId: string): Promise<Domain[]> {
        return getDomainsByServiceUseCase(this.repository, serviceId);
    }

    public claim(serviceId: string, claimDto: ClaimDomainDto): Promise<Domain> {
        return claimDomainUseCase(this.repository, serviceId, claimDto);
    }

    public update(serviceId: string, id: string, updateDto: UpdateDomainDto): Promise<Domain> {
        return updateDomainUseCase(this.repository, serviceId, id, updateDto);
    }

    public remove(serviceId: string, id: string): Promise<void> {
        return removeDomainUseCase(this.repository, serviceId, id);
    }
}
