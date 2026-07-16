import { Observable } from 'rxjs';

import { DeploymentRunTask } from '../models/deployment-run-task.model';

/**
 * Deployment queue interface.
 *
 * Contract for enqueueing a persisted deployment to be run.
 */
export interface DeploymentQueue {
    /**
     * Stream of dequeued deployment run tasks.
     */
    dequeued$: Observable<DeploymentRunTask>;

    /**
     * Enqueue a deployment run task.
     *
     * @param task Run task to enqueue
     */
    enqueue: (task: DeploymentRunTask) => void;
}
