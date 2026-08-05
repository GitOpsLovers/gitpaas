import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

import { ServiceDbEntity } from '@features/services/infrastructure/database/db-service.entity';

/**
 * Projects database entity
 */
@Entity('projects')
export class ProjectDbEntity {
    @PrimaryGeneratedColumn('uuid')
    public id!: string;

    @Column()
    public name!: string;

    @OneToMany(() => ServiceDbEntity, (service) => service.project)
    public services?: ServiceDbEntity[];
}
