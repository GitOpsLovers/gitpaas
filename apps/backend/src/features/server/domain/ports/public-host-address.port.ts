/**
 * Source of the public address this host reaches the internet through.
 */
export interface PublicHostAddress {
    /**
     * Reads the public address of this host.
     *
     * @returns The address, or `null` when the platform cannot read it
     */
    read: () => Promise<string | null>;
}
