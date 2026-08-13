import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

import type { QueuedDeploymentTaskStatus } from '../../domain/models/queued-deployment-task.models';

/**
 * Durable deployment queue task database entity.
 */
@Entity('deployment_queue_tasks')
export class DbDeploymentQueueTaskEntity {
    @PrimaryGeneratedColumn('uuid')
    public id!: string;

    @Column('uuid')
    public deploymentId!: string;

    @Column('int')
    public repositoryId!: number;

    @Column('text')
    public commit!: string;

    @Column('text')
    public composerPath!: string;

    @Column('text')
    public projectName!: string;

    @Column({ type: 'text', default: 'queued' })
    public status!: QueuedDeploymentTaskStatus;

    @Column({ type: 'int', default: 0 })
    public attempts!: number;

    @Column({ type: 'text', nullable: true })
    public lastError!: string | null;

    @Column({ type: 'text', name: 'parent_request_id', nullable: true })
    public parentRequestId!: string | null;

    @CreateDateColumn({ type: 'timestamptz' })
    public createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    public updatedAt!: Date;
}
