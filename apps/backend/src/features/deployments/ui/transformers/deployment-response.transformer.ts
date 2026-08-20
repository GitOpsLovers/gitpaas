import { Deployment, DeploymentStatus } from '../../domain/models/deployment.models';

/**
 * A deployment as an answer of the API carries it: every timestamp is a text of the ISO form.
 */
export interface DeploymentResponse {
    id: string;
    serviceId: string;
    status: DeploymentStatus;
    branch: string;
    commit: string | null;
    commitMessage: string | null;
    composerPath: string;
    triggeredBy: string;
    error: string | null;
    createdAt: string;
    finishedAt: string | null;
}

/**
 * Maps a domain deployment into the shape an answer of the API carries.
 *
 * @param deployment Domain deployment
 *
 * @returns Deployment of the wire
 */
export function toDeploymentResponse(deployment: Deployment): DeploymentResponse {
    return {
        id: deployment.id,
        serviceId: deployment.serviceId,
        status: deployment.status,
        branch: deployment.branch,
        commit: deployment.commit,
        commitMessage: deployment.commitMessage,
        composerPath: deployment.composerPath,
        triggeredBy: deployment.triggeredBy,
        error: deployment.error,
        createdAt: deployment.createdAt.toISOString(),
        finishedAt: deployment.finishedAt ? deployment.finishedAt.toISOString() : null,
    };
}
