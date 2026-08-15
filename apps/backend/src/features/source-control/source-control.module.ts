import { Module } from '@nestjs/common';

import { GithubSourceControlAdapter } from './infrastructure/github/github-source-control.adapter';

/**
 * Source control module
 *
 * The feature exposes no route of its own: the routes of the repositories live
 * under the provider, because a repository has no meaning without an account.
 */
@Module({
    providers: [GithubSourceControlAdapter],
    exports: [GithubSourceControlAdapter],
})
export class SourceControlModule {}
