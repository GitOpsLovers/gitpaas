import * as ipaddr from 'ipaddr.js';

import { CLOUDFLARE_PROVIDER_NAME } from '../domain/constants/cloudflare-ranges.constants';

/**
 * Tells whether an address falls inside one block CIDR.
 *
 * @param address Address the caller matches
 * @param range Block CIDR the address is matched against
 *
 * @returns True when the block carries the address, false when it does not or when the block is no CIDR
 */
function matchesRange(address: ipaddr.IPv4 | ipaddr.IPv6, range: string): boolean {
    if (!ipaddr.isValidCIDR(range)) {
        return false;
    }

    const block = ipaddr.parseCIDR(range);

    // A block of IPv4 and an address of IPv6 carry a different length, and the match of the library
    // throws on that pair. Thus only a block of the kind of the address is matched.
    return block[0].kind() === address.kind() && address.match(block);
}

/**
 * Names the provider of a CDN that publishes the range one address falls in.
 *
 * @param address Address that was resolved, of IPv4 or of IPv6
 * @param cloudflareRanges Blocks CIDR Cloudflare publishes, empty when the platform could not read them
 *
 * @returns The name of the provider that carries the address, or null when no provider does
 */
export function findCdnProvider(address: string, cloudflareRanges: string[]): string | null {
    if (!ipaddr.isValid(address)) {
        return null;
    }

    const parsed = ipaddr.parse(address);

    return cloudflareRanges.some((range) => matchesRange(parsed, range)) ? CLOUDFLARE_PROVIDER_NAME : null;
}
