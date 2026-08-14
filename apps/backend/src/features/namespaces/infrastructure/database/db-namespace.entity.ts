import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

/**
 * Namespaces database entity
 *
 * The unique constraint is named explicitly so it matches the hand-written
 * `UQ_namespaces_name` constraint of `iac/production/migrations/009_namespaces.sql`.
 * The `projects` relation lands together with its inverse side on
 * `DbProjectEntity`, which TypeORM needs to build the relation metadata.
 */
@Entity('namespaces')
@Unique('UQ_namespaces_name', ['name'])
export class DbNamespaceEntity {
    @PrimaryGeneratedColumn('uuid')
    public id!: string;

    @Column()
    public name!: string;
}
