import type { Project as ProjectResponse } from '@gitpaas/contracts';

import { Project } from '../../domain/models/project.models';

/**
 * Maps a domain project into the shape an answer of the API carries.
 *
 * @param project Domain project
 *
 * @returns Project of the wire
 */
export function toProjectResponse(project: Project): ProjectResponse {
    return {
        id: project.id,
        name: project.name,
        description: project.description,
        namespaceId: project.namespaceId,
        createdAt: project.createdAt.toISOString(),
        servicesCount: project.servicesCount ?? 0,
    };
}
