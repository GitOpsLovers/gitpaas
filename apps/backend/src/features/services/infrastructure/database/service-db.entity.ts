import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { ProjectDbEntity } from '@features/projects/infrastructure/database/project-db.entity';

/**
 * Services database entity
 */
@Entity('services')
export class ServiceDbEntity {
    @PrimaryGeneratedColumn('uuid')
    public id!: string;

    @Column()
    public name!: string;

    @Column('uuid')
    public projectId!: string;

    @ManyToOne(() => ProjectDbEntity, (project) => project.services, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'projectId' })
    public project?: ProjectDbEntity;
}
