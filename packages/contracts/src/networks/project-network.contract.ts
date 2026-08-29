import { z } from 'zod';

/**
 * Where a network of a project stands.
 */
export const projectNetworkStateSchema = z.enum(['ready', 'missing', 'orphan']);

/**
 * A network that belongs to one project, on the wire.
 */
export const projectNetworkSchema = z.object({
    id: z.uuid(),
    projectId: z.uuid(),
    name: z.string(),
    daemonName: z.string(),
    state: projectNetworkStateSchema,
});

/**
 * The state of a network of a project.
 */
export type ProjectNetworkState = z.infer<typeof projectNetworkStateSchema>;

/**
 * The shape of a network of a project that an answer of the API carries.
 */
export type ProjectNetwork = z.infer<typeof projectNetworkSchema>;
