import { Module } from '@nestjs/common';

import { GithubAppProvider } from './infrastructure/github/github-app.provider';
import { ProvidersController } from './ui/controllers/providers.controller';
import { ProvidersService } from './ui/services/providers.service';

@Module({
    controllers: [ProvidersController],
    providers: [
        ProvidersService,
        GithubAppProvider,
    ],
    exports: [GithubAppProvider],
})

/**
 * Providers module
 */
export class ProvidersModule {}
