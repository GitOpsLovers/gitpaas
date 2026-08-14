import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateNamespaceDto } from '../../domain/dtos/create-namespace.dto';
import { UpdateNamespaceDto } from '../../domain/dtos/update-namespace.dto';
import { Namespace } from '../../domain/models/namespace.models';
import { NamespacesRepository } from '../../domain/repositories/namespaces.repository';

import { DbNamespaceEntity } from './db-namespace.entity';
import { toNamespace } from './db-namespaces.transformer';

/**
 * Counts the projects a namespace holds, reading the `namespaceId` foreign key
 * that `iac/production/migrations/009_namespaces.sql` adds to the `projects` table.
 */
const COUNT_PROJECTS_QUERY = 'SELECT COUNT(*)::int AS "count" FROM "projects" WHERE "namespaceId" = $1';

/**
 * Namespaces database repository
 */
@Injectable()
export class DatabaseNamespacesRepository implements NamespacesRepository {
    constructor(
        @InjectRepository(DbNamespaceEntity)
        private readonly repository: Repository<DbNamespaceEntity>,
    ) {}

    public async getAll(): Promise<Namespace[]> {
        const namespaces = await this.repository.find({
            order: { id: 'DESC' },
        });

        return namespaces.map(toNamespace);
    }

    public async findById(id: string): Promise<Namespace | null> {
        const namespace = await this.repository.findOneBy({ id });

        if (!namespace) {
            return null;
        }

        return toNamespace(namespace);
    }

    public async create(createDto: CreateNamespaceDto): Promise<Namespace> {
        const namespace = this.repository.create(createDto);
        const saved = await this.repository.save(namespace);

        return toNamespace(saved);
    }

    public async update(id: string, updateDto: UpdateNamespaceDto): Promise<Namespace | null> {
        const namespace = await this.repository.findOneBy({ id });

        if (!namespace) {
            return null;
        }

        this.repository.merge(namespace, updateDto);
        const saved = await this.repository.save(namespace);

        return toNamespace(saved);
    }

    public async delete(id: string): Promise<boolean> {
        const result = await this.repository.delete(id);

        return (result.affected ?? 0) > 0;
    }

    public async countProjects(id: string): Promise<number> {
        const rows = await this.repository.manager.query<Array<{ count: number }>>(
            COUNT_PROJECTS_QUERY,
            [id],
        );

        return Number(rows[0]?.count ?? 0);
    }
}
