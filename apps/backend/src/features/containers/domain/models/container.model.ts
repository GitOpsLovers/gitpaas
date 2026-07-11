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
    state: string;
    status: string;
    createdAt: Date;
    ports: ContainerPort[];
}
