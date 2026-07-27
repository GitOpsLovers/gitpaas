import { Observable } from 'rxjs';

import { DeploymentRunTask } from '../models/deployment-run-task.models';
import { QueuedDeploymentTask } from '../models/queued-deployment-task.models';

/**
 * Maximum number of processing attempts before a queued task is dead-lettered
 */
export const MAX_ATTEMPTS = 3;

/**
 * Deployment queue port
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
