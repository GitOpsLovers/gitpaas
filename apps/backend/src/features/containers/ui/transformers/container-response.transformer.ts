import { Container, ContainerPort } from '../../domain/models/container.models';

/**
 * A container as an answer of the API carries it: every timestamp is a text of the ISO form.
 */
export interface ContainerResponse {
    id: string;
    name: string;
    image: string;
    state: string;
    status: string;
    createdAt: string;
    ports: ContainerPort[];
}

/**
 * Maps a domain container into the shape an answer of the API carries.
 *
 * @param container Domain container
 *
 * @returns Container of the wire
 */
export function toContainerResponse(container: Container): ContainerResponse {
    return {
        id: container.id,
        name: container.name,
        image: container.image,
        state: container.state,
        status: container.status,
        createdAt: container.createdAt.toISOString(),
        ports: container.ports,
    };
}
