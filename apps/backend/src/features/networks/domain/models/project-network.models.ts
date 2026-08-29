/**
 * Where a network of a project stands.
 */
export type ProjectNetworkState = 'ready' | 'missing' | 'orphan';

/**
 * A private network that belongs to one project, and that a service of that project may join
 */
export interface ProjectNetwork {
    id: string;
    projectId: string;
    name: string;
    daemonName: string;
}

/**
 * A network of a project, together with the state that the daemon gives it
 */
export interface ProjectNetworkStatus extends ProjectNetwork {
    state: ProjectNetworkState;
}
