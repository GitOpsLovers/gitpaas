/**
 * Lifecycle status of a deployment.
 */
export type DeploymentStatus = 'pending' | 'running' | 'success' | 'failed';

/**
 * A deployment is a single attempt to bring a service's compose stack up on the VPS
 */
export interface Deployment {
    id: string;
    serviceId: string;
    status: DeploymentStatus;
    branch: string;
    /** Commit SHA that was deployed, or `null` for records created before it was tracked. */
    commit: string | null;
    /** Title (first line) of the deployed commit's message, or `null` when unknown. */
    commitMessage: string | null;
    composerPath: string;
    triggeredBy: string;
    error: string | null;
    createdAt: Date;
    finishedAt: Date | null;
}
