/**
 * Lifecycle status of a deployment.
 */
export type DeploymentStatus = 'pending' | 'running' | 'success' | 'failed';

/**
 * A deployment is a single attempt to bring a service's compose stack up on the VPS.
 */
export interface Deployment {
    id: string;
    serviceId: string;
    status: DeploymentStatus;
    branch: string;
    composerPath: string;
    triggeredBy: string;
    error: string | null;
    createdAt: string;
    finishedAt: string | null;
}
