import { z } from 'zod';

/**
 * The body that authenticates a user.
 */
export const loginSchema = z.strictObject({
    email: z.email(),
    password: z.string().min(1),
});

/**
 * The body that carries a refresh token, which both the refresh and the logout read.
 */
export const refreshSchema = z.strictObject({
    refreshToken: z.jwt(),
});

/**
 * The pair of tokens that an answer of the login and of the refresh carries.
 */
export const authTokensSchema = z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
});

/**
 * The shape of the body that authenticates a user.
 */
export type LoginDto = z.infer<typeof loginSchema>;

/**
 * The shape of the body that carries a refresh token.
 */
export type RefreshDto = z.infer<typeof refreshSchema>;

/**
 * The shape of the pair of tokens that an answer of the API carries.
 */
export type AuthTokens = z.infer<typeof authTokensSchema>;
