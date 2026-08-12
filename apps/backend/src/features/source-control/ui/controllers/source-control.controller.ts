import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';

import { GitBranch } from '../../domain/models/git-branch.models';
import { GitRepository } from '../../domain/models/git-repository.models';
import { SourceControlService } from '../services/source-control.service';

import { translateError } from '@core/ui/translators/http-error.translator';

/**
 * Source control controller
 */
@Controller('source-control')
export class SourceControlController {
    constructor(private readonly service: SourceControlService) {}

    /**
     * Lists the repositories accessible to the installation.
     *
     * @returns Accessible repositories
     */
    @Get('repositories')
    public async listRepositories(): Promise<GitRepository[]> {
        try {
            return await this.service.listRepositories();
        } catch (error) {
            throw translateError(error);
        }
    }

    /**
     * Lists the branches of a repository.
     *
     * @param repositoryId Repository identifier
     *
     * @returns Accessible branches
     */
    @Get('repositories/:repositoryId/branches')
    public async listBranches(@Param('repositoryId', ParseIntPipe) repositoryId: number): Promise<GitBranch[]> {
        try {
            return await this.service.listBranches(repositoryId);
        } catch (error) {
            throw translateError(error);
        }
    }
}
