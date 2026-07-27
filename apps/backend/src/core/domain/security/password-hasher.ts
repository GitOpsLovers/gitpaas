/**
 * Password hashing port.
 */
export interface PasswordHasher {
    /**
     * Hashes a plaintext password
     *
     * @param plain Plaintext password
     *
     * @returns Hashed password
     */
    hash: (plain: string) => Promise<string>;

    /**
     * Verifies a plaintext password against a hash
     *
     * @param hash Stored password hash
     * @param plain Plaintext password to verify
     *
     * @returns `true` when the password matches the hash
     */
    verify: (hash: string, plain: string) => Promise<boolean>;
}
