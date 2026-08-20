import type { UpdateProjectDto } from '@gitpaas/contracts';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateProjectInNamespaceDto } from '../../domain/dtos/create-project-in-namespace.dto';
import { Project } from '../../domain/models/project.models';
import { ProjectsRepository } from '../../domain/repositories/projects.repository';

import { DbProjectEntity } from './db-project.entity';
import { toProject, toProjectPersistenceError } from './db-projects.transformer';

/**
 * Projects database repository
 */
@Injectable()
export class DatabaseProjectsRepository implements ProjectsRepository {
    constructor(
        @InjectRepository(DbProjectEntity)
        private readonly repository: Repository<DbProjectEntity>,
    ) {}

    public async getAll(namespaceId: string): Promise<Project[]> {
        const projects = await this.repository.find({
            where: { namespaceId },
            relations: { services: true },
            order: { id: 'DESC' },
        });

        return projects.map(toProject);
    }

    public async findById(id: string): Promise<Project | null> {
        const project = await this.repository.findOne({
            where: { id },
            relations: { services: true },
        });

        if (!project) {
            return null;
        }

        return toProject(project);
    }

    public async create(createDto: CreateProjectInNamespaceDto): Promise<Project> {
        try {
            const project = this.repository.create(createDto);
            const saved = await this.repository.save(project);

            return toProject({ ...saved, services: [] });
        } catch (error) {
            throw toProjectPersistenceError(error, createDto.namespaceId, createDto.name);
        }
    }

    public async update(id: string, updateDto: UpdateProjectDto): Promise<Project | null> {
        const project = await this.repository.findOneBy({ id });

        if (!project) {
            return null;
        }

        this.repository.merge(project, updateDto);

        try {
            const saved = await this.repository.save(project);

            return toProject({ ...saved, services: [] });
        } catch (error) {
            throw toProjectPersistenceError(error, project.namespaceId, updateDto.name);
        }
    }

    public async delete(id: string): Promise<boolean> {
        const result = await this.repository.delete(id);

        return (result.affected ?? 0) > 0;
    }
}
