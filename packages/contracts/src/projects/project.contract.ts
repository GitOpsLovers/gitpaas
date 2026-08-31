import { z } from 'zod';

/**
 * A project on the wire. It groups the services of one namespace under one scope.
 */
export const projectSchema = z.object({
    id: z.uuid(),
    name: z.string().min(1),
    description: z.string(),
    namespaceId: z.uuid(),
    createdAt: z.iso.datetime(),
    servicesCount: z.int().nonnegative(),
});

/**
 * The body that creates a project inside the namespace of the path.
 */
export const createProjectSchema = z.strictObject({
    name: z.string().min(1),
    description: z.string().max(500).optional(),
});

/**
 * The body that changes the name and the description of an existing project.
 */
export const updateProjectSchema = z.strictObject({
    name: z.string().min(1),
    description: z.string().max(500).optional(),
});

/**
 * The shape of a project that an answer of the API carries.
 */
export type Project = z.infer<typeof projectSchema>;

/**
 * The shape of the body that creates a project.
 */
export type CreateProjectDto = z.infer<typeof createProjectSchema>;

/**
 * The shape of the body that changes a project.
 */
export type UpdateProjectDto = z.infer<typeof updateProjectSchema>;
