import type { CreateProjectDto, UpdateProjectDto } from '@gitpaas/contracts';
import { Inject, Injectable } from '@nestjs/common';

import { createProjectUseCase } from '../../application/create-project.use-case';
import { deleteProjectUseCase } from '../../application/delete-project.use-case';
import { findProjectByIdUseCase } from '../../application/find-project-by-id.use-case';
import { getAllProjectsUseCase } from '../../application/get-all-projects.use-case';
import { updateProjectUseCase } from '../../application/update-project.use-case';
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
     * Gets all the projects of a namespace
     *
     * @param namespaceId Namespace id
     *
     * @returns All the projects of the namespace
     */
    public getAll(namespaceId: string): Promise<Project[]> {
        return getAllProjectsUseCase(this.repository, namespaceId);
    }

    /**
     * Gets a single project of a namespace by id
     *
     * @param namespaceId Namespace id
     * @param id Project id
     *
     * @returns Project
     */
    public findById(namespaceId: string, id: string): Promise<Project> {
        return findProjectByIdUseCase(this.repository, namespaceId, id);
    }

    /**
     * Creates a project inside a namespace
     *
     * @param namespaceId Namespace id
     * @param createDto Project data
     *
     * @returns Created project
     */
    public async create(namespaceId: string, createDto: CreateProjectDto): Promise<Project> {
        const project = await createProjectUseCase(this.repository, namespaceId, createDto);

        enrichTelemetry({ 'namespace.id': namespaceId, 'project.id': project.id });

        return project;
    }

    /**
     * Updates a project of a namespace
     *
     * @param namespaceId Namespace id
     * @param id Project id
     * @param updateDto Project data
     *
     * @returns Updated project
     */
    public update(namespaceId: string, id: string, updateDto: UpdateProjectDto): Promise<Project> {
        enrichTelemetry({ 'namespace.id': namespaceId, 'project.id': id });

        return updateProjectUseCase(this.repository, namespaceId, id, updateDto);
    }

    /**
     * Deletes a project of a namespace
     *
     * @param namespaceId Namespace id
     * @param id Project id
     *
     * @returns `true` when a row was deleted, `false` otherwise
     */
    public delete(namespaceId: string, id: string): Promise<boolean> {
        return deleteProjectUseCase(this.repository, namespaceId, id);
    }
}
