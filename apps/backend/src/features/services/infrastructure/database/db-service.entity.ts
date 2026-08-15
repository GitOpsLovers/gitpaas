import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { DbProjectEntity } from '@features/projects/infrastructure/database/db-project.entity';
import { DbProviderEntity } from '@features/providers/infrastructure/database/db-provider.entity';

/**
 * Services database entity
 */
@Entity('services')
export class DbServiceEntity {
    @PrimaryGeneratedColumn('uuid')
    public id!: string;

    @Column()
    public name!: string;

    @Column('uuid')
    public projectId!: string;

    @Column({ type: 'uuid', nullable: true })
    public providerId!: string | null;

    @Column({ type: 'text', default: '' })
    public repositoryId!: string;

    @Column({ type: 'text', default: '' })
    public deploymentBranch!: string;

    @Column({ type: 'text', default: '' })
    public composerPath!: string;

    @ManyToOne(() => DbProjectEntity, (project) => project.services, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'projectId' })
    public project?: DbProjectEntity;

    @ManyToOne(() => DbProviderEntity, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'providerId', foreignKeyConstraintName: 'FK_services_providerId' })
    public provider?: DbProviderEntity;
}
