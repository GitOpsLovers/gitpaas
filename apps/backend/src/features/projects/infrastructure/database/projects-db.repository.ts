import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateProjectDto } from '../../domain/dtos/create-project.dto';
import { UpdateProjectDto } from '../../domain/dtos/update-project.dto';
import { Project } from '../../domain/models/project.model';
import { ProjectsRepository } from '../../domain/repositories/projects.repository';

import { ProjectDbEntity } from './project-db.entity';

@Injectable()

/**
 * Projects database repository
 */
export class ProjectsDatabaseRepository implements ProjectsRepository {
    constructor(
        @InjectRepository(ProjectDbEntity)
        private readonly repository: Repository<ProjectDbEntity>,
    ) {}

    public getAll(): Promise<Project[]> {
        return this.repository.find({ order: { id: 'DESC' } });
    }

    public findById(id: string): Promise<Project | null> {
        return this.repository.findOneBy({ id });
    }

    public create(createDto: CreateProjectDto): Promise<Project> {
        const project = this.repository.create(createDto);

        return this.repository.save(project);
    }

    public async update(id: string, updateDto: UpdateProjectDto): Promise<Project | null> {
        const project = await this.repository.findOneBy({ id });

        if (!project) {
            return null;
        }

        this.repository.merge(project, updateDto);

        return this.repository.save(project);
    }

    public async delete(id: string): Promise<boolean> {
        const result = await this.repository.delete(id);

        return (result.affected ?? 0) > 0;
    }
}
