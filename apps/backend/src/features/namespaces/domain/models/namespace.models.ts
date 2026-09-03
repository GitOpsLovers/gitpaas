/**
 * A namespace is the entity used to group projects under one scope
 */
export interface Namespace {
    id: string;
    name: string;
    description: string;
    createdAt: Date;
    projectsCount?: number;
}
