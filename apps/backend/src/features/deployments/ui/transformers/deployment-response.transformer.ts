import type { Deployment as DeploymentResponse } from '@gitpaas/contracts';

import { Deployment } from '../../domain/models/deployment.models';

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
