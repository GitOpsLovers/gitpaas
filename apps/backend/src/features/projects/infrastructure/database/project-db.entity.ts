import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Projects database entity
 */
@Entity('projects')
export class ProjectDbEntity {
    @PrimaryGeneratedColumn('uuid')
    public id!: string;

    @Column()
    public name!: string;
}
