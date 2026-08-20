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

import { CompleteProviderRegistrationDto } from '../../domain/dtos/complete-provider-registration.dto';
import { ConvertProviderRegistrationDto } from '../../domain/dtos/convert-provider-registration.dto';
import { CreateProviderDto } from '../../domain/dtos/create-provider.dto';
import { StartProviderRegistrationDto } from '../../domain/dtos/start-provider-registration.dto';
import { UpdateProviderDto } from '../../domain/dtos/update-provider.dto';
import { ProviderNotFoundError } from '../../domain/errors/provider.errors';
import { GitBranch } from '../../domain/models/git-branch.models';
import { GitRepository } from '../../domain/models/git-repository.models';
import { ConvertedProviderRegistration, StartedProviderRegistration } from '../../domain/models/provider-registration.models';
import { Provider, ProviderConnectionTest } from '../../domain/models/provider.models';
import { ProvidersService } from '../services/providers.service';
import { ProviderResponse, toProviderResponse } from '../transformers/provider-response.transformer';

import { enrichTelemetry } from '@core/infrastructure/telemetry/telemetry.context';
import { translateError } from '@core/ui/translators/http-error.translator';
import { Roles } from '@features/authentication/ui/decorators/roles.decorator';
import { RolesGuard } from '@features/authentication/ui/guards/roles.guard';
import { UserRole } from '@features/users/domain/models/user.models';

/**
 * REST controller for the provider resource (`/api/v1/providers`).
 */
@Controller('providers')
@UseGuards(RolesGuard)
export class ProvidersController {
    constructor(private readonly service: ProvidersService) {}

    @Get()
    public async getAll(): Promise<ProviderResponse[]> {
        const providers = await this.service.getAll();

        return providers.map(toProviderResponse);
    }

    @Get(':id')
    public async findById(@Param('id', ParseUUIDPipe) id: string): Promise<ProviderResponse> {
        enrichTelemetry({ 'provider.id': id });

        const provider = await this.service.findById(id);

        if (!provider) {
            throw translateError(new ProviderNotFoundError(id));
        }

        return toProviderResponse(provider);
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
    public async create(@Body() createDto: CreateProviderDto): Promise<ProviderResponse> {
        try {
            const provider = await this.service.create(createDto);

            return toProviderResponse(provider);
        } catch (error) {
            throw translateError(error);
        }
    }

    /**
     * Starts the registration of a GitHub App the platform creates.
     *
     * @param startDto Name and owner of the application
     *
     * @returns The state of the registration, the manifest and the address of GitHub
     */
    @Post('registrations')
    @Roles(UserRole.Admin)
    public async startRegistration(@Body() startDto: StartProviderRegistrationDto): Promise<StartedProviderRegistration> {
        let registration: StartedProviderRegistration;

        try {
            registration = await this.service.startRegistration(startDto);
        } catch (error) {
            throw translateError(error);
        }

        enrichTelemetry({ 'provider.registration.state': registration.state });

        return registration;
    }

    /**
     * Converts the temporary code of a manifest.
     *
     * @param state State of the registration
     * @param convertDto Temporary code GitHub handed back
     *
     * @returns The state of the registration and the short name of the application
     */
    @Post('registrations/:state/conversion')
    @Roles(UserRole.Admin)
    @HttpCode(200)
    public async convertRegistration(@Param('state') state: string, @Body() convertDto: ConvertProviderRegistrationDto): Promise<ConvertedProviderRegistration> {
        enrichTelemetry({ 'provider.registration.state': state });

        try {
            return await this.service.convertRegistration(state, convertDto);
        } catch (error) {
            throw translateError(error);
        }
    }

    /**
     * Ends a registration.
     *
     * @param state State of the registration
     * @param completeDto Identifier of the installation GitHub handed back
     *
     * @returns Created provider
     */
    @Post('registrations/:state/completion')
    @Roles(UserRole.Admin)
    public async completeRegistration(@Param('state') state: string, @Body() completeDto: CompleteProviderRegistrationDto): Promise<ProviderResponse> {
        enrichTelemetry({ 'provider.registration.state': state });

        try {
            const provider = await this.service.completeRegistration(state, completeDto);

            return toProviderResponse(provider);
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
    ): Promise<ProviderResponse> {
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

        return toProviderResponse(provider);
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
     * Tests the credentials of a provider against the provider, changing no record.
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
