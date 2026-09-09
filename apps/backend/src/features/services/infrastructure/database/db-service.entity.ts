import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';

import { DbProjectEntity } from '@features/projects/infrastructure/database/db-project.entity';
import { DbProviderEntity } from '@features/providers/infrastructure/database/db-provider.entity';

/**
 * The cache of the key `environment` of the compose file of a service, as one row of the database carries it.
 */
export interface DbComposeEnvironment {
    variables: Record<string, string>;
    refreshedAt: string;
}

/**
 * Services database entity
 */
@Entity('services')
@Unique('UQ_services_projectId_name', ['projectId', 'name'])
export class DbServiceEntity {
    @PrimaryGeneratedColumn('uuid')
    public id!: string;

    @Column()
    public name!: string;

    @Column({ type: 'text', default: '' })
    public description!: string;

    @Column('uuid')
    public projectId!: string;

    @Column({ type: 'text', default: '' })
    public composeProject!: string;

    @Column({ type: 'uuid', nullable: true })
    public providerId!: string | null;

    @Column({ type: 'text', default: '' })
    public repositoryId!: string;

    @Column({ type: 'text', default: '' })
    public deploymentBranch!: string;

    @Column({ type: 'text', default: '' })
    public composerPath!: string;

    @Column({ type: 'jsonb', nullable: true })
    public composeEnvironment!: DbComposeEnvironment | null;

    @CreateDateColumn({ type: 'timestamptz' })
    public createdAt!: Date;

    @ManyToOne(() => DbProjectEntity, (project) => project.services, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'projectId' })
    public project?: DbProjectEntity;

    @ManyToOne(() => DbProviderEntity, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'providerId', foreignKeyConstraintName: 'FK_services_providerId' })
    public provider?: DbProviderEntity;
}
