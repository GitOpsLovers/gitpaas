import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import type { LogStatus } from '../../domain/models/log-event.model';
import type { LogType } from '../../domain/models/log.model';

import { DeploymentDbEntity } from '@features/deployments/infrastructure/database/deployment-db.entity';

/**
 * Logs database entity
 */
@Entity('logs')
export class LogDbEntity {
    @PrimaryGeneratedColumn('uuid')
    public id!: string;

    @Column('uuid')
    public deploymentId!: string;

    @Column('int')
    public seq!: number;

    @Column({ type: 'text' })
    public type!: LogType;

    @Column({ type: 'text', nullable: true })
    public content!: string | null;

    @Column({ type: 'text', nullable: true })
    public status!: LogStatus | null;

    @CreateDateColumn({ type: 'timestamptz' })
    public createdAt!: Date;

    @ManyToOne(() => DeploymentDbEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'deploymentId' })
    public deployment?: DeploymentDbEntity;
}
