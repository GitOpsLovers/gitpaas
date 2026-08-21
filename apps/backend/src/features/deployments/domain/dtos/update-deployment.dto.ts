import type { DeploymentStatus } from '../models/deployment.models';

/**
 * Data transfer object for updating a deployment's status.
 */
export interface UpdateDeploymentDto {
    status: DeploymentStatus;
    error?: string | null;
}
