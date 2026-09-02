/**
 * The name the platform gives Cloudflare when it recognizes one of its addresses.
 */
export const CLOUDFLARE_PROVIDER_NAME = 'Cloudflare';

/**
 * The address of the list of the ranges IPv4 Cloudflare publishes.
 */
export const CLOUDFLARE_IPV4_RANGES_URL = 'https://www.cloudflare.com/ips-v4/';

/**
 * The address of the list of the ranges IPv6 Cloudflare publishes.
 */
export const CLOUDFLARE_IPV6_RANGES_URL = 'https://www.cloudflare.com/ips-v6/';

/**
 * The time, in milliseconds, the read of one list of ranges waits for Cloudflare.
 */
export const CLOUDFLARE_RANGES_TIMEOUT_MS = 5_000;

/**
 * The time, in milliseconds, a read of the ranges is kept before the platform asks Cloudflare again.
 */
export const CLOUDFLARE_RANGES_CACHE_TTL_MS = 24 * 60 * 60 * 1_000;
