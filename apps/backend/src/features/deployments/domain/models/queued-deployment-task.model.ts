import { DeploymentRunTask } from './deployment-run-task.model';

/**
 * Lifecycle status of a persisted deployment queue row.
 *
 * - `queued`: waiting to be picked up by the runner.
 * - `processing`: currently being run.
 * - `failed`: dead-lettered after exhausting its retries.
 */
export type QueuedDeploymentTaskStatus = 'queued' | 'processing' | 'failed';

/**
 * A deployment run task as stored in the durable queue: the run-task payload
 * enriched with its queue-row identity and bookkeeping fields. The runner uses
 * the row `id` to mark the task complete or failed once it finishes.
 */
export interface QueuedDeploymentTask extends DeploymentRunTask {
    /** Identifier of the queue row backing this task. */
    id: string;
    /** Current lifecycle status of the queue row. */
    status: QueuedDeploymentTaskStatus;
    /** Number of times the task has been picked up for processing. */
    attempts: number;
}
