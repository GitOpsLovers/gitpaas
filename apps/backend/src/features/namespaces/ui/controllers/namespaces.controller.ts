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

import { CreateNamespaceDto } from '../../domain/dtos/create-namespace.dto';
import { UpdateNamespaceDto } from '../../domain/dtos/update-namespace.dto';
import { NamespaceNotFoundError } from '../../domain/errors/namespace.errors';
import { Namespace } from '../../domain/models/namespace.models';
import { NamespacesService } from '../services/namespaces.service';

import { enrichTelemetry } from '@core/infrastructure/telemetry/telemetry.context';
import { translateError } from '@core/ui/translators/http-error.translator';

/**
 * REST controller for the namespaces resource (`/api/v1/namespaces`).
 */
@Controller('namespaces')
export class NamespacesController {
    constructor(private readonly service: NamespacesService) {}

    @Get()
    public getAll(): Promise<Namespace[]> {
        return this.service.getAll();
    }

    @Get(':id')
    public async findById(@Param('id', ParseUUIDPipe) id: string): Promise<Namespace> {
        enrichTelemetry({ 'namespace.id': id });

        const namespace = await this.service.findById(id);

        if (!namespace) {
            throw translateError(new NamespaceNotFoundError(id));
        }

        return namespace;
    }

    @Post()
    public create(@Body() createDto: CreateNamespaceDto): Promise<Namespace> {
        return this.service.create(createDto);
    }

    @Put(':id')
    public async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateDto: UpdateNamespaceDto,
    ): Promise<Namespace> {
        enrichTelemetry({ 'namespace.id': id });

        const namespace = await this.service.update(id, updateDto);

        if (!namespace) {
            throw translateError(new NamespaceNotFoundError(id));
        }

        return namespace;
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

        let deleted: boolean;

        try {
            deleted = await this.service.delete(id);
        } catch (error) {
            throw translateError(error);
        }

        if (!deleted) {
            throw translateError(new NamespaceNotFoundError(id));
        }
    }
}
