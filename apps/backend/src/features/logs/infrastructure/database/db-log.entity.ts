import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import type { LogEvent, LogStatus } from '../../domain/models/log-event.models';

import { DbDeploymentEntity } from '@features/deployments/infrastructure/database/db-deployment.entity';

/**
 * Logs database entity
 *
 * The `(deploymentId, seq)` index backs the ordered replay query and the
 * line-cap trim; the `createdAt` index backs the age-based retention sweep.
 */
@Entity('logs')
@Index(['deploymentId', 'seq'])
@Index(['createdAt'])
export class DbLogEntity {
    @PrimaryGeneratedColumn('uuid')
    public id!: string;

    @Column('uuid')
    public deploymentId!: string;

    @Column('int')
    public seq!: number;

    @Column({ type: 'text' })
    public type!: LogEvent['type'];

    @Column({ type: 'text', nullable: true })
    public content!: string | null;

    @Column({ type: 'text', nullable: true })
    public status!: LogStatus | null;

    @CreateDateColumn({ type: 'timestamptz' })
    public createdAt!: Date;

    @ManyToOne(() => DbDeploymentEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'deploymentId' })
    public deployment?: DbDeploymentEntity;
}
