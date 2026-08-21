import { z } from 'zod';

import type { EndpointMap } from '../shared/endpoint.contract';

import { createNamespaceSchema, namespaceSchema, updateNamespaceSchema } from './namespace.contract';

/**
 * The path parameters that address one namespace.
 */
export const namespaceParamsSchema = z.object({
    id: z.uuid(),
});

/**
 * The five routes of the feature of the namespaces.
 */
export const namespacesEndpoints = {
    getAll: {
        method: 'GET',
        path: '/namespaces',
        response: z.array(namespaceSchema),
    },
    findById: {
        method: 'GET',
        path: '/namespaces/:id',
        params: namespaceParamsSchema,
        response: namespaceSchema,
    },
    create: {
        method: 'POST',
        path: '/namespaces',
        body: createNamespaceSchema,
        response: namespaceSchema,
    },
    update: {
        method: 'PUT',
        path: '/namespaces/:id',
        params: namespaceParamsSchema,
        body: updateNamespaceSchema,
        response: namespaceSchema,
    },
    delete: {
        method: 'DELETE',
        path: '/namespaces/:id',
        params: namespaceParamsSchema,
        response: z.void(),
    },
} as const satisfies EndpointMap;
