/**
 * Source of the ranges of the addresses Cloudflare publishes.
 */
export interface CloudflareRanges {
    /**
     * Reads the ranges IPv4 and IPv6 of Cloudflare, as blocks CIDR.
     *
     * @returns The blocks CIDR of Cloudflare in one list, empty when the source does not answer
     */
    readRanges: () => Promise<string[]>;
}
