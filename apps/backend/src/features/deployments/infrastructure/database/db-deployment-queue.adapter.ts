import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Observable, Subject } from 'rxjs';
import { In, Repository } from 'typeorm';

import { DeploymentRunTask } from '../../domain/models/deployment-run-task.models';
import { QueuedDeploymentTask } from '../../domain/models/queued-deployment-task.models';
import { DeploymentQueue, MAX_ATTEMPTS } from '../../domain/ports/deployment-queue.port';
import type { DeploymentsRepository } from '../../domain/repositories/deployments.repository';

import { DeploymentQueueTaskDbEntity } from './db-deployment-queue-task.entity';
import { toQueuedDeploymentTask } from './db-deployment-queue-task.transformer';
import { DatabaseDeploymentsRepository } from './db-deployments.repository';

/**
 * Database-backed deployment queue.
 *
 * Persists every enqueued task as a row in `deployment_queue_tasks` for
 * durability across restarts, and uses an internal RxJS `Subject` purely as the
 * in-process dispatch channel to the runner (preserving its per-project
 * serialization). No queue state lives only in memory.
 */
@Injectable()
export class DatabaseDeploymentQueueAdapter implements DeploymentQueue {
    private readonly requests = new Subject<QueuedDeploymentTask>();

    constructor(
        @InjectRepository(DeploymentQueueTaskDbEntity)
        private readonly repository: Repository<DeploymentQueueTaskDbEntity>,
        @Inject(DatabaseDeploymentsRepository)
        private readonly deploymentsRepository: DeploymentsRepository,
    ) {}

    /**
     * Stream of dequeued deployment run tasks, each carrying its queue-row id.
     */
    public get dequeued$(): Observable<QueuedDeploymentTask> {
        return this.requests.asObservable();
    }

    /**
     * Persist a run task as `queued`, then emit it for immediate pickup.
     *
     * @param task Run task to enqueue
     */
    public async enqueue(task: DeploymentRunTask): Promise<void> {
        const entity = this.repository.create({ ...task, status: 'queued', attempts: 0 });
        const saved = await this.repository.save(entity);

        this.requests.next(toQueuedDeploymentTask(saved));
    }

    /**
     * Mark a task `processing` and increment its attempt counter.
     *
     * @param taskId Queue-row identifier
     */
    public async markProcessing(taskId: string): Promise<void> {
        await this.repository.update(taskId, { status: 'processing' });
        await this.repository.increment({ id: taskId }, 'attempts', 1);
    }

    /**
     * Remove a queue row once its deployment has reached a terminal state.
     *
     * @param taskId Queue-row identifier
     */
    public async markCompleted(taskId: string): Promise<void> {
        await this.repository.delete(taskId);
    }

    /**
     * Record a task failure, retrying while attempts remain and otherwise
     * dead-lettering the row and failing the deployment.
     *
     * @param taskId Queue-row identifier
     * @param error Failure message to record
     */
    public async markFailed(taskId: string, error: string): Promise<void> {
        const task = await this.repository.findOneBy({ id: taskId });

        if (!task) {
            return;
        }

        task.lastError = error;

        if (task.attempts < MAX_ATTEMPTS) {
            task.status = 'queued';
            const saved = await this.repository.save(task);

            this.requests.next(toQueuedDeploymentTask(saved));

            return;
        }

        task.status = 'failed';
        await this.repository.save(task);
        await this.deploymentsRepository.update(task.deploymentId, { status: 'failed', error });
    }

    /**
     * Reset every unfinished (`queued`/`processing`) row back to `queued` and
     * re-emit it so interrupted tasks resume after a restart.
     */
    public async recoverPending(): Promise<void> {
        const pending = await this.repository.find({
            where: { status: In(['queued', 'processing'] satisfies Array<QueuedDeploymentTask['status']>) },
            order: { createdAt: 'ASC' },
        });

        for (const task of pending) {
            task.status = 'queued';
            const saved = await this.repository.save(task);

            this.requests.next(toQueuedDeploymentTask(saved));
        }
    }
}
