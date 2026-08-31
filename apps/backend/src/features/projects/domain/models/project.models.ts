/**
 * A project is the entity used to group different services under one scope
 */
export interface Project {
    id: string;
    name: string;
    description: string;
    namespaceId: string;
    createdAt: Date;
    servicesCount?: number;
}
