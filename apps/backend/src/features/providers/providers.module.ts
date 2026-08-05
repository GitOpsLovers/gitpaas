import { Module } from '@nestjs/common';

import { GithubProvidersAdapter } from './infrastructure/github/github-providers.adapter';
import { ProvidersController } from './ui/controllers/providers.controller';
import { ProvidersService } from './ui/services/providers.service';

/**
 * Providers module
 */
@Module({
    controllers: [ProvidersController],
    providers: [
        ProvidersService,
        GithubProvidersAdapter,
    ],
    exports: [GithubProvidersAdapter],
})
export class ProvidersModule {}
