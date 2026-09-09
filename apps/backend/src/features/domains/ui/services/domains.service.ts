import type { ClaimDomainDto, UpdateDomainDto } from '@gitpaas/contracts';
import { Inject, Injectable } from '@nestjs/common';

import { claimDomainUseCase } from '../../application/claim-domain.use-case';
import { getDomainsByServiceUseCase } from '../../application/get-domains-by-service.use-case';
import { removeDomainUseCase } from '../../application/remove-domain.use-case';
import { updateDomainUseCase } from '../../application/update-domain.use-case';
import { Domain, DomainRow } from '../../domain/models/domain.models';
import type { ComposeDomainsCacheStore } from '../../domain/ports/compose-domains-cache-store.port';
import type { ReverseProxy } from '../../domain/ports/reverse-proxy.port';
import type { DomainsRepository } from '../../domain/repositories/domains.repository';
import { DatabaseComposeDomainsCacheAdapter } from '../../infrastructure/database/db-compose-domains-cache.adapter';
import { DatabaseDomainsRepository } from '../../infrastructure/database/db-domains.repository';
import { TraefikReverseProxyAdapter } from '../../infrastructure/traefik/traefik-reverse-proxy.adapter';

/**
 * Domains service
 */
@Injectable()
export class DomainsService {
    constructor(
        @Inject(DatabaseDomainsRepository)
        private readonly repository: DomainsRepository,
        @Inject(TraefikReverseProxyAdapter)
        private readonly proxy: ReverseProxy,
        @Inject(DatabaseComposeDomainsCacheAdapter)
        private readonly cacheStore: ComposeDomainsCacheStore,
    ) {}

    public getByService(serviceId: string): Promise<DomainRow[]> {
        return getDomainsByServiceUseCase(this.repository, this.proxy, this.cacheStore, serviceId);
    }

    public claim(serviceId: string, claimDto: ClaimDomainDto): Promise<Domain> {
        return claimDomainUseCase(this.repository, serviceId, claimDto, 'user');
    }

    public update(serviceId: string, id: string, updateDto: UpdateDomainDto): Promise<Domain> {
        return updateDomainUseCase(this.repository, serviceId, id, updateDto, 'user');
    }

    public remove(serviceId: string, id: string): Promise<void> {
        return removeDomainUseCase(this.repository, serviceId, id);
    }
}
