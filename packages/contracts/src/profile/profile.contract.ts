import { z } from 'zod';

import { userSchema } from '../authentication/user.contract';

/**
 * The greatest count of the characters of a display name.
 */
export const PROFILE_DISPLAY_NAME_MAX_LENGTH = 80;

/**
 * The least count of the characters of a new password.
 */
export const PROFILE_PASSWORD_MIN_LENGTH = 8;

/**
 * The account of the user of the token, which carries the same shape as a user of the wire.
 */
export const profileSchema = userSchema;

/**
 * The body that changes the display name of the account, where `null` clears it.
 */
export const updateProfileNameSchema = z.strictObject({
    displayName: z.string().trim().min(1).max(PROFILE_DISPLAY_NAME_MAX_LENGTH).nullable(),
});

/**
 * The body that changes the email address of the account.
 */
export const updateProfileEmailSchema = z.strictObject({
    email: z.email(),
});

/**
 * The body that changes the password of the account.
 */
export const updateProfilePasswordSchema = z.strictObject({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(PROFILE_PASSWORD_MIN_LENGTH),
});

/**
 * The shape of the account that an answer of the API carries.
 */
export type Profile = z.infer<typeof profileSchema>;

/**
 * The shape of the body that changes the display name.
 */
export type UpdateProfileNameDto = z.infer<typeof updateProfileNameSchema>;

/**
 * The shape of the body that changes the email address.
 */
export type UpdateProfileEmailDto = z.infer<typeof updateProfileEmailSchema>;

/**
 * The shape of the body that changes the password.
 */
export type UpdateProfilePasswordDto = z.infer<typeof updateProfilePasswordSchema>;
