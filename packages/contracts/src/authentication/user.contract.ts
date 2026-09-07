import { z } from 'zod';

/**
 * A user on the wire.
 */
export const userSchema = z.object({
    id: z.uuid(),
    email: z.email(),
    displayName: z.string().nullable(),
    totpEnabled: z.boolean(),
    isActive: z.boolean(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
});

/**
 * The shape of a user that an answer of the API carries.
 */
export type User = z.infer<typeof userSchema>;
