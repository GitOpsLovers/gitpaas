import type { EndpointMap } from '../shared/endpoint.contract';

import { orphanRemovalResultSchema, pruneResultSchema } from './maintenance.contract';
import { readinessResultSchema } from './readiness.contract';
import { serverStatusSchema } from './server-status.contract';

/**
 * The six routes of the feature of the server.
 */
export const serverEndpoints = {
    readiness: {
        method: 'GET',
        path: '/server/readiness',
        response: readinessResultSchema,
    },
    getStatus: {
        method: 'GET',
        path: '/server/status',
        response: serverStatusSchema,
    },
    pruneImages: {
        method: 'POST',
        path: '/server/prune/images',
        response: pruneResultSchema,
    },
    pruneVolumes: {
        method: 'POST',
        path: '/server/prune/volumes',
        response: pruneResultSchema,
    },
    pruneContainers: {
        method: 'POST',
        path: '/server/prune/containers',
        response: pruneResultSchema,
    },
    removeOrphanedContainers: {
        method: 'POST',
        path: '/server/containers/orphaned',
        response: orphanRemovalResultSchema,
    },
} as const satisfies EndpointMap;
