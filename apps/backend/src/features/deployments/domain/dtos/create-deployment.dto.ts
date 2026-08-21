/**
 * Data transfer object for create a new deployment.
 */
export interface CreateDeploymentDto {
    serviceId: string;
    branch: string;
    commit: string;
    commitMessage: string;
    composerPath: string;
    triggeredBy: string;
}
