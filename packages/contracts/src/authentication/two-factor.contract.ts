import { z } from 'zod';

import { authTokensSchema } from './authentication.contract';

/**
 * The count of the digits of a code of the second factor.
 */
export const TOTP_CODE_LENGTH = 6;

/**
 * The shape a code of the second factor must carry: six digits, and nothing else.
 */
export const TOTP_CODE_PATTERN = /^\d{6}$/;

/**
 * A code of six digits, which an application of the authenticator produces.
 */
export const totpCodeSchema = z.string().regex(TOTP_CODE_PATTERN);

/**
 * The answer of a login whose account holds a second factor.
 */
export const twoFactorChallengeSchema = z.object({
    twoFactorRequired: z.literal(true),
    challengeToken: z.string(),
});

/**
 * The answer of a login, which carries the pair of tokens, or the challenge of the second factor.
 */
export const loginResultSchema = z.union([authTokensSchema, twoFactorChallengeSchema]);

/**
 * The body of the second step of the login.
 */
export const verifyTwoFactorSchema = z.strictObject({
    challengeToken: z.jwt(),
    code: totpCodeSchema,
});

/**
 * The secret that a setup of the second factor produces, ready for an authenticator.
 */
export const totpSetupSchema = z.object({
    secret: z.string(),
    otpauthUri: z.string(),
    qrCode: z.string(),
});

/**
 * The body that confirms a setup of the second factor.
 */
export const enableTotpSchema = z.strictObject({
    code: totpCodeSchema,
});

/**
 * The shape of the challenge of the second factor.
 */
export type TwoFactorChallenge = z.infer<typeof twoFactorChallengeSchema>;

/**
 * The shape of the answer of a login.
 */
export type LoginResult = z.infer<typeof loginResultSchema>;

/**
 * The shape of the body of the second step of the login.
 */
export type VerifyTwoFactorDto = z.infer<typeof verifyTwoFactorSchema>;

/**
 * The shape of the secret that a setup of the second factor produces.
 */
export type TotpSetup = z.infer<typeof totpSetupSchema>;

/**
 * The shape of the body that confirms a setup of the second factor.
 */
export type EnableTotpDto = z.infer<typeof enableTotpSchema>;
