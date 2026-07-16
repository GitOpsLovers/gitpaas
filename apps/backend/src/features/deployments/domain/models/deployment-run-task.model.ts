/**
 * A unit of work enqueued to run a persisted deployment in the background.
 */
export interface DeploymentRunTask {
    deploymentId: string;
    repositoryId: number;
    commit: string;
    composerPath: string;
    projectName: string;
}
