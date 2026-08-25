import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DbDomainEntity } from './infrastructure/database/db-domain.entity';
import { DatabaseDomainsRepository } from './infrastructure/database/db-domains.repository';
import { TraefikReverseProxyAdapter } from './infrastructure/traefik/traefik-reverse-proxy.adapter';
import { DomainsController } from './ui/controllers/domains.controller';
import { DomainsService } from './ui/services/domains.service';

/**
 * Domains feature module.
 */
@Module({
    imports: [TypeOrmModule.forFeature([DbDomainEntity])],
    controllers: [DomainsController],
    providers: [
        DomainsService,
        DatabaseDomainsRepository,
        TraefikReverseProxyAdapter,
    ],
    exports: [DatabaseDomainsRepository, TraefikReverseProxyAdapter],
})
export class DomainsModule {}
