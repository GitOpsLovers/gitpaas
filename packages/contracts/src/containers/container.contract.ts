import { z } from 'zod';

/**
 * A published port mapping of a container, as an answer of the API carries it.
 */
export const containerPortSchema = z.object({
    privatePort: z.int().nonnegative(),
    publicPort: z.int().nonnegative().nullable(),
    type: z.string(),
});

/**
 * A container of the stack of one service, on the wire.
 */
export const containerSchema = z.object({
    id: z.string(),
    name: z.string(),
    image: z.string(),
    state: z.string(),
    status: z.string(),
    createdAt: z.iso.datetime(),
    ports: z.array(containerPortSchema),
});

/**
 * The shape of a published port that an answer of the API carries.
 */
export type ContainerPort = z.infer<typeof containerPortSchema>;

/**
 * The shape of a container that an answer of the API carries.
 */
export type Container = z.infer<typeof containerSchema>;
