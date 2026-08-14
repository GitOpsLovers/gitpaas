/**
 * A namespace is the entity used to group projects under one scope
 */
export interface Namespace {
    id: string;
    name: string;
    projectsCount?: number;
}
