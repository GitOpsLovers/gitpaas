/**
 * Data transfer object for creating a service.
 */
export interface CreateServiceWithComposeProjectDto {
    name: string;
    description?: string;
    projectId: string;
    providerId?: string | null;
    composeProject: string;
}
