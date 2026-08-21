import { z } from 'zod';

import type { EndpointMap } from '../shared/endpoint.contract';

import { createProjectSchema, projectSchema, updateProjectSchema } from './project.contract';

/**
 * The path parameters that scope a request to one namespace.
 */
export const projectsNamespaceParamsSchema = z.object({
    namespaceId: z.uuid(),
});

/**
 * The path parameters that address one project of one namespace.
 */
export const projectParamsSchema = z.object({
    namespaceId: z.uuid(),
    id: z.uuid(),
});

/**
 * The five routes of the feature of the projects.
 */
export const projectsEndpoints = {
    getAll: {
        method: 'GET',
        path: '/namespaces/:namespaceId/projects',
        params: projectsNamespaceParamsSchema,
        response: z.array(projectSchema),
    },
    findById: {
        method: 'GET',
        path: '/namespaces/:namespaceId/projects/:id',
        params: projectParamsSchema,
        response: projectSchema,
    },
    create: {
        method: 'POST',
        path: '/namespaces/:namespaceId/projects',
        params: projectsNamespaceParamsSchema,
        body: createProjectSchema,
        response: projectSchema,
    },
    update: {
        method: 'PUT',
        path: '/namespaces/:namespaceId/projects/:id',
        params: projectParamsSchema,
        body: updateProjectSchema,
        response: projectSchema,
    },
    delete: {
        method: 'DELETE',
        path: '/namespaces/:namespaceId/projects/:id',
        params: projectParamsSchema,
        response: z.void(),
    },
} as const satisfies EndpointMap;
