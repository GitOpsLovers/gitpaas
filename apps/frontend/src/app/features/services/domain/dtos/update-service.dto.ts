/**
 * Data transfer object for updating an existing service
 */
export interface UpdateServiceDto {
    name: string;
    repositoryId?: string;
    deploymentBranch?: string;
    composerPath?: string;
}
