import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';

import { GitBranch } from '../../domain/models/git-branch.models';
import { GitRepository } from '../../domain/models/git-repository.models';
import { SourceControlService } from '../services/source-control.service';

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
    public listRepositories(): Promise<GitRepository[]> {
        return this.service.listRepositories();
    }

    /**
     * Lists the branches of a repository.
     *
     * @param repositoryId Repository identifier
     *
     * @returns Accessible branches
     */
    @Get('repositories/:repositoryId/branches')
    public listBranches(@Param('repositoryId', ParseIntPipe) repositoryId: number): Promise<GitBranch[]> {
        return this.service.listBranches(repositoryId);
    }
}
