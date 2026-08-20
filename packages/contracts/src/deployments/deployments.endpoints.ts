import { z } from 'zod';

import type { EndpointMap } from '../shared/endpoint.contract';

import { deploymentSchema, triggerDeploymentSchema } from './deployment.contract';

/**
 * The path parameters that address one deployment.
 */
export const deploymentParamsSchema = z.object({
    id: z.uuid(),
});

/**
 * The query that scopes the list of the deployments to one service.
 */
export const deploymentsQuerySchema = z.object({
    serviceId: z.uuid(),
});

/**
 * The four routes of the feature of the deployments.
 */
export const deploymentsEndpoints = {
    getAllByService: {
        method: 'GET',
        path: '/deployments',
        query: deploymentsQuerySchema,
        response: z.array(deploymentSchema),
    },
    findById: {
        method: 'GET',
        path: '/deployments/:id',
        params: deploymentParamsSchema,
        response: deploymentSchema,
    },
    create: {
        method: 'POST',
        path: '/deployments',
        body: triggerDeploymentSchema,
        response: deploymentSchema,
    },
    delete: {
        method: 'DELETE',
        path: '/deployments/:id',
        params: deploymentParamsSchema,
        response: z.void(),
    },
} as const satisfies EndpointMap;
