import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

import type { QueuedDeploymentTaskStatus } from '../../domain/models/queued-deployment-task.model';

/**
 * Durable deployment queue task database entity.
 *
 * One row per enqueued deployment run. Rows outlive the process so tasks are
 * never lost on restart; the runner deletes a row once its deployment reaches a
 * terminal state.
 */
@Entity('deployment_queue_tasks')
export class DeploymentQueueTaskDbEntity {
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

    @CreateDateColumn({ type: 'timestamptz' })
    public createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    public updatedAt!: Date;
}
