import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DbProviderEntity } from './infrastructure/database/db-provider.entity';
import { DatabaseProvidersRepository } from './infrastructure/database/db-providers.repository';
import { GithubSourceControlAdapter } from './infrastructure/github/github-source-control.adapter';
import { ProvidersController } from './ui/controllers/providers.controller';
import { ProvidersService } from './ui/services/providers.service';

/**
 * Source control module
 *
 * The feature owns the record of the provider, the port of the source control
 * and its adapter: the routes of the repositories live under the provider,
 * because a repository has no meaning without an account.
 */
@Module({
    imports: [TypeOrmModule.forFeature([DbProviderEntity])],
    controllers: [ProvidersController],
    providers: [
        ProvidersService,
        DatabaseProvidersRepository,
        GithubSourceControlAdapter,
    ],
    exports: [
        DatabaseProvidersRepository,
        GithubSourceControlAdapter,
    ],
})
export class SourceControlModule {}
