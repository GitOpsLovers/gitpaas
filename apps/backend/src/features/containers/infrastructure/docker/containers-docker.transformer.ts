import { Container } from '../../domain/models/container.models';

import type { RuntimeContainerSummary } from '@core/domain/models/container-runtime.models';

/**
 * Narrows a container-runtime container summary into the domain model.
 *
 * @param info Container-runtime container summary
 *
 * @returns Normalized container
 */
export function toContainer(info: RuntimeContainerSummary): Container {
    return {
        id: info.id,
        name: info.names[0]?.replace(/^\//, '') ?? info.id.slice(0, 12),
        image: info.image,
        state: info.state,
        status: info.status,
        createdAt: info.createdAt,
        ports: info.ports.map((port) => ({
            privatePort: port.privatePort,
            publicPort: port.publicPort,
            type: port.type,
        })),
    };
}
