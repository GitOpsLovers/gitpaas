import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DatabaseComposeDomainsCacheAdapter } from './infrastructure/database/db-compose-domains-cache.adapter';
import { DbDomainEntity } from './infrastructure/database/db-domain.entity';
import { DatabaseDomainsRepository } from './infrastructure/database/db-domains.repository';
import { TraefikReverseProxyAdapter } from './infrastructure/traefik/traefik-reverse-proxy.adapter';
import { DomainsController } from './ui/controllers/domains.controller';
import { DomainsService } from './ui/services/domains.service';

import { DbServiceEntity } from '@features/services/infrastructure/database/db-service.entity';

/**
 * Domains feature module.
 */
@Module({
    imports: [TypeOrmModule.forFeature([DbDomainEntity, DbServiceEntity])],
    controllers: [DomainsController],
    providers: [
        DomainsService,
        DatabaseDomainsRepository,
        DatabaseComposeDomainsCacheAdapter,
        TraefikReverseProxyAdapter,
    ],
    exports: [DatabaseDomainsRepository, TraefikReverseProxyAdapter],
})
export class DomainsModule {}
