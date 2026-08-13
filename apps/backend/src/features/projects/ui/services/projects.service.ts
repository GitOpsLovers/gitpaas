import { Inject, Injectable } from '@nestjs/common';

import { createProjectUseCase } from '../../application/create-project.use-case';
import { deleteProjectUseCase } from '../../application/delete-project.use-case';
import { findProjectByIdUseCase } from '../../application/find-project-by-id.use-case';
import { getAllProjectsUseCase } from '../../application/get-all-projects.use-case';
import { updateProjectUseCase } from '../../application/update-project.use-case';
import { CreateProjectDto } from '../../domain/dtos/create-project.dto';
import { UpdateProjectDto } from '../../domain/dtos/update-project.dto';
import { Project } from '../../domain/models/project.models';
import type { ProjectsRepository } from '../../domain/repositories/projects.repository';
import { DatabaseProjectsRepository } from '../../infrastructure/database/db-projects.repository';

import { enrichTelemetry } from '@core/infrastructure/telemetry/telemetry.context';

/**
 * Projects service
 */
@Injectable()
export class ProjectsService {
    constructor(
        @Inject(DatabaseProjectsRepository)
        private readonly repository: ProjectsRepository,
    ) {}

    /**
     * Gets all projects
     *
     * @returns All projects
     */
    public getAll(): Promise<Project[]> {
        return getAllProjectsUseCase(this.repository);
    }

    /**
     * Gets a single project by id
     *
     * @param id Project id
     *
     * @returns Project, or `null` when it does not exist
     */
    public findById(id: string): Promise<Project | null> {
        return findProjectByIdUseCase(this.repository, id);
    }

    /**
     * Creates a project
     *
     * @param createDto Project data
     *
     * @returns Created project
     */
    public async create(createDto: CreateProjectDto): Promise<Project> {
        const project = await createProjectUseCase(this.repository, createDto);

        enrichTelemetry({ 'project.id': project.id });

        return project;
    }

    /**
     * Updates a project
     *
     * @param id Project id
     * @param updateDto Project data
     *
     * @returns Updated project, or `null` when it does not exist
     */
    public update(id: string, updateDto: UpdateProjectDto): Promise<Project | null> {
        return updateProjectUseCase(this.repository, id, updateDto);
    }

    /**
     * Deletes a project
     *
     * @param id Project id
     * @returns `true` when a row was deleted, `false` otherwise
     */
    public delete(id: string): Promise<boolean> {
        return deleteProjectUseCase(this.repository, id);
    }
}
