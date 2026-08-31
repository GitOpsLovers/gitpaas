/**
 * Data transfer object for creating a new project inside a namespace
 */
export interface CreateProjectInNamespaceDto {
    name: string;
    description?: string;
    namespaceId: string;
}
