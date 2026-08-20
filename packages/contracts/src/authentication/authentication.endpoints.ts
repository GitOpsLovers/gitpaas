import { z } from 'zod';

import type { EndpointMap } from '../shared/endpoint.contract';

import { authTokensSchema, loginSchema, refreshSchema } from './authentication.contract';
import { userSchema } from './user.contract';

/**
 * The four routes of the feature of the authentication.
 */
export const authenticationEndpoints = {
    login: {
        method: 'POST',
        path: '/auth/login',
        body: loginSchema,
        response: authTokensSchema,
    },
    refresh: {
        method: 'POST',
        path: '/auth/refresh',
        body: refreshSchema,
        response: authTokensSchema,
    },
    logout: {
        method: 'POST',
        path: '/auth/logout',
        body: refreshSchema,
        response: z.void(),
    },
    me: {
        method: 'GET',
        path: '/auth/me',
        response: userSchema,
    },
} as const satisfies EndpointMap;
