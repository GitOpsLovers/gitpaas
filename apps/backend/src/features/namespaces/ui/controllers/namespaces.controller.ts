import { createNamespaceSchema, updateNamespaceSchema } from '@gitpaas/contracts';
import type {
    CreateNamespaceDto,
    Namespace as NamespaceResponse,
    UpdateNamespaceDto,
} from '@gitpaas/contracts';
import {
    // eslint-disable-next-line @typescript-eslint/no-redeclare
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    Param,
    ParseUUIDPipe,
    Post,
    Put,
} from '@nestjs/common';

import { NamespacesService } from '../services/namespaces.service';
import { toNamespaceResponse } from '../transformers/namespace-response.transformer';

import { enrichTelemetry } from '@core/infrastructure/telemetry/telemetry.context';
import { ZodValidationPipe } from '@core/ui/pipes/zod-validation.pipe';
import { translateError } from '@core/ui/translators/http-error.translator';

/**
 * REST controller for the namespaces resource (`/api/v1/namespaces`).
 */
@Controller('namespaces')
export class NamespacesController {
    constructor(private readonly service: NamespacesService) {}

    @Get()
    public async getAll(): Promise<NamespaceResponse[]> {
        const namespaces = await this.service.getAll();

        return namespaces.map(toNamespaceResponse);
    }

    @Get(':id')
    public async findById(@Param('id', ParseUUIDPipe) id: string): Promise<NamespaceResponse> {
        enrichTelemetry({ 'namespace.id': id });

        try {
            return toNamespaceResponse(await this.service.findById(id));
        } catch (error) {
            throw translateError(error);
        }
    }

    @Post()
    public async create(
        @Body(new ZodValidationPipe(createNamespaceSchema)) createDto: CreateNamespaceDto,
    ): Promise<NamespaceResponse> {
        return toNamespaceResponse(await this.service.create(createDto));
    }

    @Put(':id')
    public async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body(new ZodValidationPipe(updateNamespaceSchema)) updateDto: UpdateNamespaceDto,
    ): Promise<NamespaceResponse> {
        enrichTelemetry({ 'namespace.id': id });

        try {
            return toNamespaceResponse(await this.service.update(id, updateDto));
        } catch (error) {
            throw translateError(error);
        }
    }

    /**
     * Deletes a namespace, answering `409` while it still holds projects.
     *
     * @param id Namespace id
     */
    @Delete(':id')
    @HttpCode(204)
    public async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        enrichTelemetry({ 'namespace.id': id });

        try {
            await this.service.delete(id);
        } catch (error) {
            throw translateError(error);
        }
    }
}
