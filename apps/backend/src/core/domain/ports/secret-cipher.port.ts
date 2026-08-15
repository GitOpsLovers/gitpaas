/**
 * Secret cipher port.
 */
export interface SecretCipher {
    /**
     * Seals a secret.
     *
     * @param plainText Secret to seal
     *
     * @returns The sealed payload
     */
    encryptSecret: (plainText: string) => string;

    /**
     * Opens a sealed payload.
     *
     * @param payload Sealed payload
     *
     * @returns The secret in clear text
     */
    decryptSecret: (payload: string) => string;
}
