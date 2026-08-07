import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

import { DbServiceEntity } from '@features/services/infrastructure/database/db-service.entity';

/**
 * Projects database entity
 */
@Entity('projects')
export class DbProjectEntity {
    @PrimaryGeneratedColumn('uuid')
    public id!: string;

    @Column()
    public name!: string;

    @OneToMany(() => DbServiceEntity, (service) => service.project)
    public services?: DbServiceEntity[];
}
