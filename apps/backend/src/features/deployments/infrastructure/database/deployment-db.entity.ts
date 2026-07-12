import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { ServiceDbEntity } from '@features/services/infrastructure/database/service-db.entity';

import type { DeploymentStatus } from '../../domain/models/deployment.model';

/**
 * Deployments database entity
 */
@Entity('deployments')
export class DeploymentDbEntity {
    @PrimaryGeneratedColumn('uuid')
    public id!: string;

    @Column('uuid')
    public serviceId!: string;

    @Column({ type: 'text', default: 'pending' })
    public status!: DeploymentStatus;

    @Column({ type: 'text', default: '' })
    public branch!: string;

    @Column({ type: 'text', nullable: true })
    public commit!: string | null;

    @Column({ type: 'text', nullable: true })
    public commitMessage!: string | null;

    @Column({ type: 'text', default: '' })
    public composerPath!: string;

    @Column({ type: 'text', default: '' })
    public triggeredBy!: string;

    @Column({ type: 'text', nullable: true })
    public error!: string | null;

    @CreateDateColumn({ type: 'timestamptz' })
    public createdAt!: Date;

    @Column({ type: 'timestamptz', nullable: true })
    public finishedAt!: Date | null;

    @ManyToOne(() => ServiceDbEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'serviceId' })
    public service?: ServiceDbEntity;
}
