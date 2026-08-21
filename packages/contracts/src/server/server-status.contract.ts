import { z } from 'zod';

/**
 * The state of the daemon of the container runtime of the server, as it answers the call of the status.
 */
export const serverStatusSchema = z.object({
    connected: z.boolean(),
    serverVersion: z.string(),
    operatingSystem: z.string(),
    containers: z.number().int(),
    images: z.number().int(),
});

/**
 * The shape of the state of the daemon that an answer of the API carries.
 */
export type ServerStatus = z.infer<typeof serverStatusSchema>;
