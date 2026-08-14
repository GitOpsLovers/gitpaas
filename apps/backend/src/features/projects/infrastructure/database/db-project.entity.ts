import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, Unique } from 'typeorm';

import { DbNamespaceEntity } from '@features/namespaces/infrastructure/database/db-namespace.entity';
import { DbServiceEntity } from '@features/services/infrastructure/database/db-service.entity';

/**
 * Projects database entity
 *
 * The composite unique constraint is named explicitly so it matches the
 * hand-written `UQ_projects_namespaceId_name` constraint of
 * `iac/production/migrations/009_namespaces.sql`. The namespace relation uses
 * `RESTRICT`, so the database itself refuses to delete a namespace that still
 * holds projects.
 */
@Entity('projects')
@Unique('UQ_projects_namespaceId_name', ['namespaceId', 'name'])
export class DbProjectEntity {
    @PrimaryGeneratedColumn('uuid')
    public id!: string;

    @Column()
    public name!: string;

    @Column('uuid')
    public namespaceId!: string;

    @ManyToOne(() => DbNamespaceEntity, (namespace) => namespace.projects, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'namespaceId', foreignKeyConstraintName: 'FK_projects_namespaceId' })
    public namespace?: DbNamespaceEntity;

    @OneToMany(() => DbServiceEntity, (service) => service.project)
    public services?: DbServiceEntity[];
}
