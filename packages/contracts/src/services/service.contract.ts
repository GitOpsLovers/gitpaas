import { z } from 'zod';

/**
 * A service on the wire. It is a deployable application that belongs to one project.
 */
export const serviceSchema = z.object({
    id: z.uuid(),
    name: z.string().min(1),
    projectId: z.uuid(),
    providerId: z.uuid().nullable(),
    repositoryId: z.string(),
    deploymentBranch: z.string(),
    composerPath: z.string(),
});

/**
 * The body that creates a service inside a project.
 */
export const createServiceSchema = z.strictObject({
    name: z.string().min(1),
    projectId: z.uuid(),
    providerId: z.uuid().nullable().optional(),
});

/**
 * The body that changes an existing service.
 */
export const updateServiceSchema = z.strictObject({
    name: z.string().min(1),
    providerId: z.uuid().nullable().optional(),
    repositoryId: z.string().optional(),
    deploymentBranch: z.string().optional(),
    composerPath: z.string().optional(),
});

/**
 * The shape of a service that an answer of the API carries.
 */
export type Service = z.infer<typeof serviceSchema>;

/**
 * The shape of the body that creates a service.
 */
export type CreateServiceDto = z.infer<typeof createServiceSchema>;

/**
 * The shape of the body that changes a service.
 */
export type UpdateServiceDto = z.infer<typeof updateServiceSchema>;
