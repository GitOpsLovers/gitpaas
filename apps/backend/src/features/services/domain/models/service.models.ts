/**
 * A service is a deployable app that belongs to a single project
 */
export interface Service {
    id: string;
    name: string;
    description: string;
    projectId: string;
    composeProject: string;
    providerId: string | null;
    repositoryId: string;
    deploymentBranch: string;
    composerPath: string;
    createdAt: Date;
}
