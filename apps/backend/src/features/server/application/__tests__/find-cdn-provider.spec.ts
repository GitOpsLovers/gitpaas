import { CLOUDFLARE_PROVIDER_NAME } from '../../domain/constants/cloudflare-ranges.constants';
import { findCdnProvider } from '../find-cdn-provider';

/** The ranges of Cloudflare the matcher is exercised against, of IPv4 and of IPv6. */
const cloudflareRanges = ['173.245.48.0/20', '103.21.244.0/22', '2400:cb00::/32'];

describe('findCdnProvider', () => {
    it('names Cloudflare when the address falls in a range IPv4 of Cloudflare', () => {
        expect(findCdnProvider('173.245.48.7', cloudflareRanges)).toBe(CLOUDFLARE_PROVIDER_NAME);
    });

    it('names Cloudflare when the address falls in a range IPv4 that is not the first one', () => {
        expect(findCdnProvider('103.21.245.1', cloudflareRanges)).toBe(CLOUDFLARE_PROVIDER_NAME);
    });

    it('names Cloudflare when the address falls in a range IPv6 of Cloudflare', () => {
        expect(findCdnProvider('2400:cb00::1', cloudflareRanges)).toBe(CLOUDFLARE_PROVIDER_NAME);
    });

    it('names no provider when the address IPv4 falls outside every range', () => {
        expect(findCdnProvider('203.0.113.10', cloudflareRanges)).toBeNull();
    });

    it('names no provider when the address IPv6 falls outside every range', () => {
        expect(findCdnProvider('2001:db8::1', cloudflareRanges)).toBeNull();
    });

    it('names no provider when the address sits one step below a range', () => {
        expect(findCdnProvider('173.245.47.255', cloudflareRanges)).toBeNull();
    });

    it('names no provider when the address sits one step above a range', () => {
        expect(findCdnProvider('173.245.64.0', cloudflareRanges)).toBeNull();
    });

    it('names no provider when the platform could not read the ranges', () => {
        expect(findCdnProvider('173.245.48.7', [])).toBeNull();
    });

    it('names no provider when the address is no address', () => {
        expect(findCdnProvider('not-an-address', cloudflareRanges)).toBeNull();
    });

    it('never throws when an address IPv6 meets a range IPv4, and names no provider', () => {
        expect(findCdnProvider('2001:db8::1', ['173.245.48.0/20'])).toBeNull();
    });

    it('never throws when an address IPv4 meets a range IPv6, and names no provider', () => {
        expect(findCdnProvider('173.245.48.7', ['2400:cb00::/32'])).toBeNull();
    });

    it('skips a range that is no block CIDR, and reads the ones that follow', () => {
        expect(findCdnProvider('173.245.48.7', ['not-a-range', '173.245.48.0/20'])).toBe(CLOUDFLARE_PROVIDER_NAME);
    });
});
