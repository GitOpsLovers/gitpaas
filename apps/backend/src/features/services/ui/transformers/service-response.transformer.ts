import type { Service as ServiceResponse } from '@gitpaas/contracts';

import { Service } from '../../domain/models/service.models';

/**
 * Maps a domain service into the shape an answer of the API carries.
 *
 * @param service Domain service
 *
 * @returns Service of the wire
 */
export function toServiceResponse(service: Service): ServiceResponse {
    return {
        id: service.id,
        name: service.name,
        description: service.description,
        projectId: service.projectId,
        providerId: service.providerId,
        repositoryId: service.repositoryId,
        deploymentBranch: service.deploymentBranch,
        composerPath: service.composerPath,
        createdAt: service.createdAt.toISOString(),
    };
}
