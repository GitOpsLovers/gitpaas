import { z } from 'zod';

import type { EndpointMap } from '../shared/endpoint.contract';

import { containerSchema } from './container.contract';

/**
 * The query that scopes the list of the containers to one service.
 */
export const containersQuerySchema = z.object({
    serviceId: z.uuid(),
});

/**
 * The one route of the feature of the containers.
 */
export const containersEndpoints = {
    getAllByService: {
        method: 'GET',
        path: '/containers',
        query: containersQuerySchema,
        response: z.array(containerSchema),
    },
} as const satisfies EndpointMap;
