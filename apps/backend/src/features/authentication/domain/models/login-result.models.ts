import { AuthTokens } from './auth-tokens.models';

/**
 * The answer of a login whose account holds a second factor.
 */
export interface TwoFactorChallenge {
    twoFactorRequired: true;
    challengeToken: string;
}

/**
 * What a login answers: the pair of tokens, or the challenge of the second factor.
 */
export type LoginResult = AuthTokens | TwoFactorChallenge;
