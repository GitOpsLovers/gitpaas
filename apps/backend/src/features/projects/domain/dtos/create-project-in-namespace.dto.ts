/**
 * Data transfer object for creating a new project inside a namespace
 */
export interface CreateProjectInNamespaceDto {
    name: string;
    namespaceId: string;
}
