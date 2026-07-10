import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    NotFoundException,
    Param,
    ParseUUIDPipe,
    Post,
    Put,
    Query,
} from '@nestjs/common';

import { CreateServiceDto } from '../../domain/dtos/create-service.dto';
import { UpdateServiceDto } from '../../domain/dtos/update-service.dto';
import { Service } from '../../domain/models/service.model';
import { ServicesService } from '../services/services.service';

/**
 * REST controller for the services resource (`/api/v1/services`).
 */
@Controller('services')

/**
 * Services controller
 */
export class ServicesController {
    constructor(private readonly service: ServicesService) {}

    @Get()
    public getAllByProject(@Query('projectId', ParseUUIDPipe) projectId: string): Promise<Service[]> {
        return this.service.getAllByProject(projectId);
    }

    @Get(':id')
    public async findById(@Param('id', ParseUUIDPipe) id: string): Promise<Service> {
        const service = await this.service.findById(id);

        if (!service) {
            throw new NotFoundException(`Service ${id} not found`);
        }

        return service;
    }

    @Post()
    public create(@Body() createDto: CreateServiceDto): Promise<Service> {
        return this.service.create(createDto);
    }

    @Put(':id')
    public async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateDto: UpdateServiceDto,
    ): Promise<Service> {
        const service = await this.service.update(id, updateDto);

        if (!service) {
            throw new NotFoundException(`Service ${id} not found`);
        }

        return service;
    }

    @Delete(':id')
    @HttpCode(204)
    public async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        const deleted = await this.service.delete(id);

        if (!deleted) {
            throw new NotFoundException(`Service ${id} not found`);
        }
    }
}
