import { Observable } from 'rxjs';

import { DeploymentRunTask } from '../models/deployment-run-task.model';
import { QueuedDeploymentTask } from '../models/queued-deployment-task.model';

/**
 * Maximum number of processing attempts before a queued task is dead-lettered
 * (its row marked `failed` and its deployment failed).
 */
export const MAX_ATTEMPTS = 3;

/**
 * Deployment queue interface.
 *
 * Contract for a durable, at-least-once deployment queue: tasks are persisted
 * so they survive process restarts, retried on failure and dead-lettered once
 * their attempts are exhausted. An in-process stream carries persisted tasks to
 * the runner for immediate pickup.
 */
export interface DeploymentQueue {
    /**
     * Stream of dequeued deployment run tasks, each carrying its queue-row id.
     */
    dequeued$: Observable<QueuedDeploymentTask>;

    /**
     * Persist a deployment run task as `queued`, then emit it for immediate
     * pickup by the runner.
     *
     * @param task Run task to enqueue
     */
    enqueue: (task: DeploymentRunTask) => Promise<void>;

    /**
     * Mark a queued task as `processing` and increment its attempt counter.
     *
     * @param taskId Queue-row identifier
     */
    markProcessing: (taskId: string) => Promise<void>;

    /**
     * Remove a queue row once its deployment has reached a terminal state.
     *
     * @param taskId Queue-row identifier
     */
    markCompleted: (taskId: string) => Promise<void>;

    /**
     * Record a task failure. Re-enqueues the task while it has attempts left;
     * otherwise dead-letters the row (`status = 'failed'`) and fails the
     * corresponding deployment so it is never stranded in `pending`.
     *
     * @param taskId Queue-row identifier
     * @param error Failure message to record
     */
    markFailed: (taskId: string, error: string) => Promise<void>;

    /**
     * Recover interrupted work after a restart: reset every `queued` or
     * `processing` row back to `queued` and re-emit it for pickup.
     */
    recoverPending: () => Promise<void>;
}
