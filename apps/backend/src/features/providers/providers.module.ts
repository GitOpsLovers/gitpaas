import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DbProviderRegistrationEntity } from './infrastructure/database/db-provider-registration.entity';
import { DatabaseProviderRegistrationsRepository } from './infrastructure/database/db-provider-registrations.repository';
import { DbProviderEntity } from './infrastructure/database/db-provider.entity';
import { DatabaseProvidersRepository } from './infrastructure/database/db-providers.repository';
import { GithubProviderClientAdapter } from './infrastructure/github/github-provider-client.adapter';
import { ProvidersController } from './ui/controllers/providers.controller';
import { RemoveExpiredProviderRegistrationsJob } from './ui/jobs/remove-expired-provider-registrations.job';
import { ProvidersService } from './ui/services/providers.service';

/**
 * Providers module
 *
 * The feature owns the record of the provider, the port of the provider client
 * and its adapter: the routes of the repositories live under the provider,
 * because a repository has no meaning without an account.
 */
@Module({
    imports: [TypeOrmModule.forFeature([DbProviderEntity, DbProviderRegistrationEntity])],
    controllers: [ProvidersController],
    providers: [
        ProvidersService,
        DatabaseProvidersRepository,
        DatabaseProviderRegistrationsRepository,
        GithubProviderClientAdapter,
        RemoveExpiredProviderRegistrationsJob,
    ],
    exports: [
        DatabaseProvidersRepository,
        DatabaseProviderRegistrationsRepository,
        GithubProviderClientAdapter,
    ],
})
export class ProvidersModule {}
