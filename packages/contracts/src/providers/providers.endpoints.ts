import { z } from 'zod';

import type { EndpointMap } from '../shared/endpoint.contract';

import { gitBranchSchema, gitRepositorySchema } from './git.contract';
import {
    completeProviderRegistrationSchema,
    convertedProviderRegistrationSchema,
    convertProviderRegistrationSchema,
    startedProviderRegistrationSchema,
    startProviderRegistrationSchema,
} from './provider-registration.contract';
import {
    createProviderSchema,
    providerConnectionTestSchema,
    providerSchema,
    updateProviderSchema,
} from './provider.contract';

/**
 * The path parameters that address one provider.
 */
export const providerParamsSchema = z.object({
    id: z.uuid(),
});

/**
 * The path parameters that address one repository of a provider.
 */
export const providerRepositoryParamsSchema = z.object({
    providerId: z.uuid(),
    repositoryId: z.coerce.number().int(),
});

/**
 * The path parameters that address one registration of a provider.
 */
export const providerRegistrationParamsSchema = z.object({
    state: z.string(),
});

/**
 * The eleven routes of the feature of the providers.
 */
export const providersEndpoints = {
    getAll: {
        method: 'GET',
        path: '/providers',
        response: z.array(providerSchema),
    },
    findById: {
        method: 'GET',
        path: '/providers/:id',
        params: providerParamsSchema,
        response: providerSchema,
    },
    create: {
        method: 'POST',
        path: '/providers',
        body: createProviderSchema,
        response: providerSchema,
    },
    update: {
        method: 'PUT',
        path: '/providers/:id',
        params: providerParamsSchema,
        body: updateProviderSchema,
        response: providerSchema,
    },
    delete: {
        method: 'DELETE',
        path: '/providers/:id',
        params: providerParamsSchema,
        response: z.void(),
    },
    testConnection: {
        method: 'POST',
        path: '/providers/:id/test',
        params: providerParamsSchema,
        response: providerConnectionTestSchema,
    },
    listRepositories: {
        method: 'GET',
        path: '/providers/:providerId/repositories',
        params: providerRepositoryParamsSchema.pick({ providerId: true }),
        response: z.array(gitRepositorySchema),
    },
    listBranches: {
        method: 'GET',
        path: '/providers/:providerId/repositories/:repositoryId/branches',
        params: providerRepositoryParamsSchema,
        response: z.array(gitBranchSchema),
    },
    startRegistration: {
        method: 'POST',
        path: '/providers/registrations',
        body: startProviderRegistrationSchema,
        response: startedProviderRegistrationSchema,
    },
    convertRegistration: {
        method: 'POST',
        path: '/providers/registrations/:state/conversion',
        params: providerRegistrationParamsSchema,
        body: convertProviderRegistrationSchema,
        response: convertedProviderRegistrationSchema,
    },
    completeRegistration: {
        method: 'POST',
        path: '/providers/registrations/:state/completion',
        params: providerRegistrationParamsSchema,
        body: completeProviderRegistrationSchema,
        response: providerSchema,
    },
} as const satisfies EndpointMap;
