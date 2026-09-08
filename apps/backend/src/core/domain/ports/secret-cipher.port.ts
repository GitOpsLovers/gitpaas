/**
 * Secret cipher port.
 */
export interface SecretCipher {
    /**
     * Seals a secret.
     *
     * @param plainText Secret to seal
     * @param aad Identifier of the row that holds the secret, which binds the payload to it
     *
     * @returns The sealed payload
     */
    encryptSecret: (plainText: string, aad?: string) => string;

    /**
     * Opens a sealed payload.
     *
     * @param payload Sealed payload
     * @param aad Identifier of the row that holds the secret, as the seal received it
     *
     * @returns The secret in clear text
     */
    decryptSecret: (payload: string, aad?: string) => string;
}
