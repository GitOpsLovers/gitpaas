import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';

import { GitBranch } from '../../domain/models/git-branch.model';
import { GitRepository } from '../../domain/models/git-repository.model';
import { ProvidersService } from '../services/providers.service';

/**
 * REST controller for the GitHub integration (`/api/v1/github`).
 */
@Controller('github')
export class ProvidersController {
    constructor(private readonly service: ProvidersService) {}

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
