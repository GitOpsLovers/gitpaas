import { Module } from '@nestjs/common';

import { GithubAppProvider } from './infrastructure/github/github-app.provider';
import { GithubController } from './ui/controllers/github.controller';
import { GithubService } from './ui/services/github.service';

@Module({
    controllers: [GithubController],
    providers: [
        GithubService,
        GithubAppProvider,
    ],
    exports: [GithubAppProvider],
})

/**
 * Providers module
 */
export class ProvidersModule {}
