import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';

import { DbProjectEntity } from '@features/projects/infrastructure/database/db-project.entity';

/**
 * Project networks database entity.
 */
@Entity('project_networks')
@Unique('UQ_project_networks_projectId_name', ['projectId', 'name'])
@Unique('UQ_project_networks_daemonName', ['daemonName'])
export class DbProjectNetworkEntity {
    @PrimaryGeneratedColumn('uuid')
    public id!: string;

    @Column('uuid')
    public projectId!: string;

    @Column('text')
    public name!: string;

    @Column('text')
    public daemonName!: string;

    @ManyToOne(() => DbProjectEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'projectId', foreignKeyConstraintName: 'FK_project_networks_projectId' })
    public project?: DbProjectEntity;
}
