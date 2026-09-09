import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ComposeDomainsCacheStore } from '../../domain/ports/compose-domains-cache-store.port';

import { ComposeDomainsCache } from '@features/services/domain/models/compose-domains.models';
import { DbServiceEntity } from '@features/services/infrastructure/database/db-service.entity';
import { toComposeDomainsCache } from '@features/services/infrastructure/database/db-services.transformer';

/**
 * Database store of the cache of the key `x-gitpaas-domain` of the compose file of a service
 */
@Injectable()
export class DatabaseComposeDomainsCacheAdapter implements ComposeDomainsCacheStore {
    constructor(
        @InjectRepository(DbServiceEntity)
        private readonly repository: Repository<DbServiceEntity>,
    ) {}

    public async findByService(serviceId: string): Promise<ComposeDomainsCache | null> {
        const service = await this.repository.findOne({
            where: { id: serviceId },
            select: { id: true, composeDomains: true },
        });

        return toComposeDomainsCache(service?.composeDomains ?? null);
    }
}
