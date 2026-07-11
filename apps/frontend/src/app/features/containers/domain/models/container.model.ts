/**
 * A published port mapping of a container.
 */
export interface ContainerPort {
    privatePort: number;
    publicPort: number | null;
    type: string;
}

/**
 * A Docker container belonging to a service's compose stack.
 */
export interface Container {
    id: string;
    name: string;
    image: string;
    /** Lifecycle state, e.g. `running`, `exited`, `created`. */
    state: string;
    /** Human-readable status, e.g. `Up 3 minutes`. */
    status: string;
    createdAt: string;
    ports: ContainerPort[];
}
