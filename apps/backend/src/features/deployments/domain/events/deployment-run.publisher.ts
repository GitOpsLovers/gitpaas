/**
 * Request to run (build + bring up) a persisted deployment in the background.
 *
 * Published by the deployments feature when a deployment is triggered and
 * consumed by the logs feature, which owns the docker run and its log stream.
 */
export interface DeploymentRunRequest {
    deploymentId: string;
    repositoryId: number;
    commit: string;
    composerPath: string;
    projectName: string;
}

/**
 * Deployment-run publisher (the port).
 *
 * The domain-facing contract for asking that a persisted deployment be run,
 * without knowing how or by whom the run is carried out. The infrastructure
 * adapter (the deployment-run bus) implements it, keeping the application layer
 * free of any framework or infrastructure dependency.
 */
export interface DeploymentRunPublisher {
    /**
     * Publish a deployment-run request to subscribers.
     *
     * @param request Run request to publish
     */
    request: (request: DeploymentRunRequest) => void;
}
