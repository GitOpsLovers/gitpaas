import {
    // eslint-disable-next-line @typescript-eslint/no-redeclare
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
} from '@nestjs/common';

import { CreateProjectDto } from '../../domain/dtos/create-project.dto';
import { UpdateProjectDto } from '../../domain/dtos/update-project.dto';
import { Project } from '../../domain/models/project.model';
import { ProjectsService } from '../services/projects.service';

/**
 * REST controller for the projects resource (`/api/v1/projects`).
 */
@Controller('projects')
export class ProjectsController {
    constructor(private readonly service: ProjectsService) {}

    @Get()
    public getAll(): Promise<Project[]> {
        return this.service.getAll();
    }

    @Get(':id')
    public async findById(@Param('id', ParseUUIDPipe) id: string): Promise<Project> {
        const project = await this.service.findById(id);

        if (!project) {
            throw new NotFoundException(`Project ${id} not found`);
        }

        return project;
    }

    @Post()
    public create(@Body() createDto: CreateProjectDto): Promise<Project> {
        return this.service.create(createDto);
    }

    @Put(':id')
    public async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateDto: UpdateProjectDto,
    ): Promise<Project> {
        const project = await this.service.update(id, updateDto);

        if (!project) {
            throw new NotFoundException(`Project ${id} not found`);
        }

        return project;
    }

    @Delete(':id')
    @HttpCode(204)
    public async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        const deleted = await this.service.delete(id);

        if (!deleted) {
            throw new NotFoundException(`Project ${id} not found`);
        }
    }
}
