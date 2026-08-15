import {
    // eslint-disable-next-line @typescript-eslint/no-redeclare
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    Param,
    ParseIntPipe,
    ParseUUIDPipe,
    Post,
    Put,
    UseGuards,
} from '@nestjs/common';

import { CreateProviderDto } from '../../domain/dtos/create-provider.dto';
import { UpdateProviderDto } from '../../domain/dtos/update-provider.dto';
import { ProviderNotFoundError } from '../../domain/errors/provider.errors';
import { GitBranch } from '../../domain/models/git-branch.models';
import { GitRepository } from '../../domain/models/git-repository.models';
import { Provider, ProviderConnectionTest } from '../../domain/models/provider.models';
import { ProvidersService } from '../services/providers.service';

import { enrichTelemetry } from '@core/infrastructure/telemetry/telemetry.context';
import { translateError } from '@core/ui/translators/http-error.translator';
import { Roles } from '@features/authentication/ui/decorators/roles.decorator';
import { RolesGuard } from '@features/authentication/ui/guards/roles.guard';
import { UserRole } from '@features/users/domain/models/user.models';

/**
 * REST controller for the source control resource (`/api/v1/source-control`).
 *
 * The read routes stay open to each authenticated user, because the form of a
 * service must offer the list. Only an administrator writes a provider.
 *
 * No answer of this controller carries a private key: the read model gives the
 * fingerprint of the key instead.
 */
@Controller('source-control')
@UseGuards(RolesGuard)
export class ProvidersController {
    constructor(private readonly service: ProvidersService) {}

    @Get()
    public getAll(): Promise<Provider[]> {
        return this.service.getAll();
    }

    @Get(':id')
    public async findById(@Param('id', ParseUUIDPipe) id: string): Promise<Provider> {
        enrichTelemetry({ 'provider.id': id });

        const provider = await this.service.findById(id);

        if (!provider) {
            throw translateError(new ProviderNotFoundError(id));
        }

        return provider;
    }

    /**
     * Registers a provider, answering `409` when another provider carries the name.
     *
     * @param createDto Provider data
     *
     * @returns Created provider
     */
    @Post()
    @Roles(UserRole.Admin)
    public async create(@Body() createDto: CreateProviderDto): Promise<Provider> {
        try {
            return await this.service.create(createDto);
        } catch (error) {
            throw translateError(error);
        }
    }

    /**
     * Changes a provider. An absent or empty private key keeps the stored one.
     *
     * @param id Provider id
     * @param updateDto Provider data
     *
     * @returns Updated provider
     */
    @Put(':id')
    @Roles(UserRole.Admin)
    public async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateDto: UpdateProviderDto,
    ): Promise<Provider> {
        enrichTelemetry({ 'provider.id': id });

        let provider: Provider | null;

        try {
            provider = await this.service.update(id, updateDto);
        } catch (error) {
            throw translateError(error);
        }

        if (!provider) {
            throw translateError(new ProviderNotFoundError(id));
        }

        return provider;
    }

    /**
     * Deletes a provider, answering `409` while a service still points at it.
     *
     * @param id Provider id
     */
    @Delete(':id')
    @Roles(UserRole.Admin)
    @HttpCode(204)
    public async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        enrichTelemetry({ 'provider.id': id });

        let deleted: boolean;

        try {
            deleted = await this.service.delete(id);
        } catch (error) {
            throw translateError(error);
        }

        if (!deleted) {
            throw translateError(new ProviderNotFoundError(id));
        }
    }

    /**
     * Tests the credentials of a provider against the source control, changing no record.
     *
     * @param id Provider id
     *
     * @returns Outcome of the test
     */
    @Post(':id/test')
    @Roles(UserRole.Admin)
    @HttpCode(200)
    public async testConnection(@Param('id', ParseUUIDPipe) id: string): Promise<ProviderConnectionTest> {
        enrichTelemetry({ 'provider.id': id });

        try {
            return await this.service.testConnection(id);
        } catch (error) {
            throw translateError(error);
        }
    }

    /**
     * Lists the repositories the installation of a provider can reach.
     *
     * @param providerId Provider id
     *
     * @returns Accessible repositories
     */
    @Get(':providerId/repositories')
    public async listRepositories(@Param('providerId', ParseUUIDPipe) providerId: string): Promise<GitRepository[]> {
        enrichTelemetry({ 'provider.id': providerId });

        try {
            return await this.service.listRepositories(providerId);
        } catch (error) {
            throw translateError(error);
        }
    }

    /**
     * Lists the branches of a repository of a provider.
     *
     * @param providerId Provider id
     * @param repositoryId Repository identifier
     *
     * @returns Accessible branches
     */
    @Get(':providerId/repositories/:repositoryId/branches')
    public async listBranches(
        @Param('providerId', ParseUUIDPipe) providerId: string,
        @Param('repositoryId', ParseIntPipe) repositoryId: number,
    ): Promise<GitBranch[]> {
        enrichTelemetry({ 'provider.id': providerId, 'deps.github.repository_id': repositoryId });

        try {
            return await this.service.listBranches(providerId, repositoryId);
        } catch (error) {
            throw translateError(error);
        }
    }
}
