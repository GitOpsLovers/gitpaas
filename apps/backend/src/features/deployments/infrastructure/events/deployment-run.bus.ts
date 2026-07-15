import { Injectable } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

import { DeploymentRunPublisher, DeploymentRunRequest } from '../../domain/events/deployment-run.publisher';

export type { DeploymentRunRequest } from '../../domain/events/deployment-run.publisher';

/**
 * Deployment-run event bus.
 *
 * A dependency-free, in-process pub/sub seam internal to the deployments
 * feature: publishing a request decouples the synchronous trigger response from
 * the long-running background run, so the created deployment's id returns
 * immediately while the feature's own runner consumes the request and executes
 * the run. Implements the domain {@link DeploymentRunPublisher} port.
 */
@Injectable()
export class DeploymentRunBus implements DeploymentRunPublisher {
    private readonly requests = new Subject<DeploymentRunRequest>();

    /**
     * Stream of deployment-run requests.
     */
    public get requests$(): Observable<DeploymentRunRequest> {
        return this.requests.asObservable();
    }

    /**
     * Publish a deployment-run request to subscribers.
     *
     * @param request Run request to publish
     */
    public request(request: DeploymentRunRequest): void {
        this.requests.next(request);
    }
}
