import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    Unique,
} from 'typeorm';

import { DbNamespaceEntity } from '@features/namespaces/infrastructure/database/db-namespace.entity';
import { DbServiceEntity } from '@features/services/infrastructure/database/db-service.entity';

/**
 * Projects database entity
 */
@Entity('projects')
@Unique('UQ_projects_namespaceId_name', ['namespaceId', 'name'])
export class DbProjectEntity {
    @PrimaryGeneratedColumn('uuid')
    public id!: string;

    @Column()
    public name!: string;

    @Column({ type: 'text', default: '' })
    public description!: string;

    @Column('uuid')
    public namespaceId!: string;

    @CreateDateColumn({ type: 'timestamptz' })
    public createdAt!: Date;

    @ManyToOne(() => DbNamespaceEntity, (namespace) => namespace.projects, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'namespaceId', foreignKeyConstraintName: 'FK_projects_namespaceId' })
    public namespace?: DbNamespaceEntity;

    @OneToMany(() => DbServiceEntity, (service) => service.project)
    public services?: DbServiceEntity[];
}
