/**
 * A service is a deployable app that belongs to a single project
 */
export interface Service {
    id: string;
    name: string;
    projectId: string;
    providerId: string | null;
    repositoryId: string;
    deploymentBranch: string;
    composerPath: string;
}
