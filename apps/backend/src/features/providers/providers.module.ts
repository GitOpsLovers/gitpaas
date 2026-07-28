import { Module } from '@nestjs/common';

import { ProvidersGithubAdapter } from './infrastructure/github/providers-github.adapter';
import { ProvidersController } from './ui/controllers/providers.controller';
import { ProvidersService } from './ui/services/providers.service';

/**
 * Providers module
 */
@Module({
    controllers: [ProvidersController],
    providers: [
        ProvidersService,
        ProvidersGithubAdapter,
    ],
    exports: [ProvidersGithubAdapter],
})
export class ProvidersModule {}
