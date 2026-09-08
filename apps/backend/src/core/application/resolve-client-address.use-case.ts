import * as ipaddr from 'ipaddr.js';

/**
 * Tracker used when the request carries no address that can be parsed.
 */
const UNKNOWN_CLIENT_ADDRESS = 'unknown';

/**
 * Groups of an IPv6 address that name the network of the client, that is a prefix of 64 bits.
 */
const IPV6_NETWORK_GROUPS = 4;

/**
 * Use case for resolving the address a rate limit counts a request against.
 *
 * @param address Remote address of the request, as Express resolved it
 *
 * @returns The tracker of the client
 */
export function resolveClientAddressUseCase(address: unknown): string {
    if (typeof address !== 'string') {
        return UNKNOWN_CLIENT_ADDRESS;
    }

    const value = address.trim();

    if (!ipaddr.isValid(value)) {
        return UNKNOWN_CLIENT_ADDRESS;
    }

    const parsed = ipaddr.parse(value);

    if (parsed.kind() === 'ipv4') {
        return parsed.toString();
    }

    const sixth = parsed as ipaddr.IPv6;

    if (sixth.isIPv4MappedAddress()) {
        return sixth.toIPv4Address().toString();
    }

    return `${sixth.toNormalizedString().split(':').slice(0, IPV6_NETWORK_GROUPS).join(':')}::/64`;
}
