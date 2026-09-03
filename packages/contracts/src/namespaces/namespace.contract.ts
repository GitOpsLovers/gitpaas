import { z } from 'zod';

/**
 * A namespace on the wire. It groups the projects of one scope.
 */
export const namespaceSchema = z.object({
    id: z.uuid(),
    name: z.string().min(1),
    description: z.string(),
    createdAt: z.iso.datetime(),
    projectsCount: z.int().nonnegative().optional(),
});

/**
 * The body that creates a namespace.
 */
export const createNamespaceSchema = z.strictObject({
    name: z.string().min(1),
    description: z.string().max(500).optional(),
});

/**
 * The body that changes the name and the description of an existing namespace.
 */
export const updateNamespaceSchema = z.strictObject({
    name: z.string().min(1).optional(),
    description: z.string().max(500).optional(),
});

/**
 * The shape of a namespace that an answer of the API carries.
 */
export type Namespace = z.infer<typeof namespaceSchema>;

/**
 * The shape of the body that creates a namespace.
 */
export type CreateNamespaceDto = z.infer<typeof createNamespaceSchema>;

/**
 * The shape of the body that changes a namespace.
 */
export type UpdateNamespaceDto = z.infer<typeof updateNamespaceSchema>;
