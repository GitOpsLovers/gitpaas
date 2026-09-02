import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, Unique } from 'typeorm';

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

    @Column({ type: 'text', default: '' })
    public description!: string;

    @CreateDateColumn({ type: 'timestamptz' })
    public createdAt!: Date;

    @OneToMany(() => DbProjectEntity, (project) => project.namespace)
    public projects?: DbProjectEntity[];
}
