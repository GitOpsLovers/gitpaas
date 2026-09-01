/**
 * Time-based one-time password port.
 */
export interface Totp {
    /**
     * Draws a fresh secret an authenticator can hold.
     *
     * @returns The secret, in the Base32 form the authenticators read
     */
    generateSecret: () => string;

    /**
     * Builds the `otpauth://` address an authenticator enrols from.
     *
     * @param secret Secret of the account, in the Base32 form
     * @param accountLabel Label the authenticator shows for the account
     *
     * @returns The `otpauth://` address
     */
    buildKeyUri: (secret: string, accountLabel: string) => string;

    /**
     * Checks a code of six digits against a secret.
     *
     * @param secret Secret of the account, in the Base32 form
     * @param code Code the client presented
     *
     * @returns Whether the code belongs to that secret
     */
    verifyCode: (secret: string, code: string) => Promise<boolean>;
}
