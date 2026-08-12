import { Module } from '@nestjs/common';

import { GithubSourceControlAdapter } from './infrastructure/github/github-source-control.adapter';
import { SourceControlController } from './ui/controllers/source-control.controller';
import { SourceControlService } from './ui/services/source-control.service';

/**
 * Source control module
 */
@Module({
    controllers: [SourceControlController],
    providers: [
        SourceControlService,
        GithubSourceControlAdapter,
    ],
    exports: [GithubSourceControlAdapter],
})
export class SourceControlModule {}
