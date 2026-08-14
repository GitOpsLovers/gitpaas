import { Column, Entity, OneToMany, PrimaryGeneratedColumn, Unique } from 'typeorm';

import { DbProjectEntity } from '@features/projects/infrastructure/database/db-project.entity';

/**
 * Namespaces database entity
 */
@Entity('namespaces')
@Unique('UQ_namespaces_name', ['name'])
export class DbNamespaceEntity {
    @PrimaryGeneratedColumn('uuid')
    public id!: string;

    @Column()
    public name!: string;

    @OneToMany(() => DbProjectEntity, (project) => project.namespace)
    public projects?: DbProjectEntity[];
}
