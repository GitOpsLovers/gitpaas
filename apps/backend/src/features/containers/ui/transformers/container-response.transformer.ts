import type { Container as ContainerResponse } from '@gitpaas/contracts';

import { Container } from '../../domain/models/container.models';

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
