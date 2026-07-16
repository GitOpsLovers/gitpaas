import Docker from 'dockerode';

import { Container } from '../../domain/models/container.model';

/**
 * Narrows a Dockerode container summary into the domain model.
 *
 * @param info Dockerode container summary
 *
 * @returns Normalized container
 */
export function toContainer(info: Docker.ContainerInfo): Container {
    return {
        id: info.Id,
        name: info.Names?.[0]?.replace(/^\//, '') ?? info.Id.slice(0, 12),
        image: info.Image,
        state: info.State,
        status: info.Status,
        createdAt: new Date(info.Created * 1000),
        ports: (info.Ports ?? []).map((port) => ({
            privatePort: port.PrivatePort,
            publicPort: port.PublicPort ?? null,
            type: port.Type,
        })),
    };
}
