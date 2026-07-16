import { Injectable } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

import { DeploymentRunTask } from '../../domain/models/deployment-run-task.model';
import { DeploymentQueue } from '../../domain/queues/deployment.queue';

/**
 * RxJS-backed deployment queue.
 */
@Injectable()
export class RxjsDeploymentQueue implements DeploymentQueue {
    private readonly requests = new Subject<DeploymentRunTask>();

    /**
     * Stream of dequeued deployment run tasks.
     */
    public get dequeued$(): Observable<DeploymentRunTask> {
        return this.requests.asObservable();
    }

    /**
     * Enqueue a deployment run task.
     *
     * @param task Run task to enqueue
     */
    public enqueue(task: DeploymentRunTask): void {
        this.requests.next(task);
    }
}
