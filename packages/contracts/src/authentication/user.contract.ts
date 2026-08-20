import { z } from 'zod';

/**
 * The role of a user, which gates the actions that it may perform.
 */
export const userRoleSchema = z.enum(['admin', 'user']);

/**
 * A user on the wire.
 */
export const userSchema = z.object({
    id: z.uuid(),
    email: z.email(),
    role: userRoleSchema,
    isActive: z.boolean(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
});

/**
 * The role of a user, as an answer of the API carries it.
 */
export type UserRole = z.infer<typeof userRoleSchema>;

/**
 * The shape of a user that an answer of the API carries.
 */
export type User = z.infer<typeof userSchema>;
