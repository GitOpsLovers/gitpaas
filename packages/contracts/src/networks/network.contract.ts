import { z } from 'zod';

/**
 * Where a network of a service stands.
 */
export const networkStateSchema = z.enum(['attached', 'declared', 'connected']);

/**
 * A network of the stack of one service, on the wire.
 */
export const networkSchema = z.object({
    id: z.string(),
    name: z.string(),
    driver: z.string(),
    scope: z.string(),
    internal: z.boolean(),
    attachable: z.boolean(),
    createdAt: z.iso.datetime(),
    state: networkStateSchema,
});

/**
 * The state of a network of a service.
 */
export type NetworkState = z.infer<typeof networkStateSchema>;

/**
 * The shape of a network that an answer of the API carries.
 */
export type Network = z.infer<typeof networkSchema>;
