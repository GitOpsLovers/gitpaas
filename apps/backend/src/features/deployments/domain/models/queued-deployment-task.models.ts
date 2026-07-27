import { DeploymentRunTask } from './deployment-run-task.models';

/**
 * Lifecycle status of a persisted deployment queue row.
 */
export type QueuedDeploymentTaskStatus = 'queued' | 'processing' | 'failed';

/**
 * A deployment run task as stored in the durable queue
 */
export interface QueuedDeploymentTask extends DeploymentRunTask {
    id: string;
    status: QueuedDeploymentTaskStatus;
    attempts: number;
}
