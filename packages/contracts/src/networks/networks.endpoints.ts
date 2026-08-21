import { z } from 'zod';

import type { EndpointMap } from '../shared/endpoint.contract';

import { networkSchema } from './network.contract';

/**
 * The query that scopes the list of the networks to one service.
 */
export const networksQuerySchema = z.object({
    serviceId: z.uuid(),
});

/**
 * The one route of the feature of the networks.
 */
export const networksEndpoints = {
    getAllByService: {
        method: 'GET',
        path: '/networks',
        query: networksQuerySchema,
        response: z.array(networkSchema),
    },
} as const satisfies EndpointMap;
