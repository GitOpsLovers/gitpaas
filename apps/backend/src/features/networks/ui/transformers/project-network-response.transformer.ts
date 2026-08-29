import type { ProjectNetwork as ProjectNetworkResponse } from '@gitpaas/contracts';

import { ProjectNetworkStatus } from '../../domain/models/project-network.models';

/**
 * Maps a network of a project into the shape an answer of the API carries.
 *
 * @param network Network of a project, with its state
 *
 * @returns Network of the wire
 */
export function toProjectNetworkResponse(network: ProjectNetworkStatus): ProjectNetworkResponse {
    return {
        id: network.id,
        projectId: network.projectId,
        name: network.name,
        daemonName: network.daemonName,
        state: network.state,
    };
}
