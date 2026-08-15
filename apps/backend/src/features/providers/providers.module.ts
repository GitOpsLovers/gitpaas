import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DbProviderEntity } from './infrastructure/database/db-provider.entity';
import { DatabaseProvidersRepository } from './infrastructure/database/db-providers.repository';
import { GithubProviderClientAdapter } from './infrastructure/github/github-provider-client.adapter';
import { ProvidersController } from './ui/controllers/providers.controller';
import { ProvidersService } from './ui/services/providers.service';

/**
 * Providers module
 *
 * The feature owns the record of the provider, the port of the provider client
 * and its adapter: the routes of the repositories live under the provider,
 * because a repository has no meaning without an account.
 */
@Module({
    imports: [TypeOrmModule.forFeature([DbProviderEntity])],
    controllers: [ProvidersController],
    providers: [
        ProvidersService,
        DatabaseProvidersRepository,
        GithubProviderClientAdapter,
    ],
    exports: [
        DatabaseProvidersRepository,
        GithubProviderClientAdapter,
    ],
})
export class ProvidersModule {}
