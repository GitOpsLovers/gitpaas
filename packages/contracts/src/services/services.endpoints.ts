import { z } from 'zod';

import type { EndpointMap } from '../shared/endpoint.contract';

import { createServiceSchema, serviceSchema, updateServiceSchema } from './service.contract';

/**
 * The path parameters that address one service.
 */
export const serviceParamsSchema = z.object({
    id: z.uuid(),
});

/**
 * The query that scopes the list of the services to one project.
 */
export const servicesQuerySchema = z.object({
    projectId: z.uuid(),
});

/**
 * The five routes of the feature of the services.
 */
export const servicesEndpoints = {
    getAllByProject: {
        method: 'GET',
        path: '/services',
        query: servicesQuerySchema,
        response: z.array(serviceSchema),
    },
    findById: {
        method: 'GET',
        path: '/services/:id',
        params: serviceParamsSchema,
        response: serviceSchema,
    },
    create: {
        method: 'POST',
        path: '/services',
        body: createServiceSchema,
        response: serviceSchema,
    },
    update: {
        method: 'PUT',
        path: '/services/:id',
        params: serviceParamsSchema,
        body: updateServiceSchema,
        response: serviceSchema,
    },
    delete: {
        method: 'DELETE',
        path: '/services/:id',
        params: serviceParamsSchema,
        response: z.void(),
    },
} as const satisfies EndpointMap;
