import { CLOUDFLARE_PROVIDER_NAME } from '../../domain/constants/cloudflare-ranges.constants';
import type { CloudflareRanges } from '../../domain/ports/cloudflare-ranges.port';
import type { DnsResolver } from '../../domain/ports/dns-resolver.port';
import type { PublicHostAddress } from '../../domain/ports/public-host-address.port';
import { checkControlPlaneDomainUseCase } from '../check-control-plane-domain.use-case';

describe('checkControlPlaneDomainUseCase', () => {
    let mockDnsResolver: jest.Mocked<Pick<DnsResolver, 'resolveAddresses'>>;
    let mockPublicHostAddress: jest.Mocked<Pick<PublicHostAddress, 'read'>>;
    let mockCloudflareRanges: jest.Mocked<Pick<CloudflareRanges, 'readRanges'>>;

    beforeEach(() => {
        jest.clearAllMocks();

        mockDnsResolver = { resolveAddresses: jest.fn() };
        mockPublicHostAddress = { read: jest.fn() };
        mockCloudflareRanges = { readRanges: jest.fn().mockResolvedValue([]) };
    });

    /** Runs the use case with the mocked ports, applying the casts one time. */
    const run = (host: string) =>
        checkControlPlaneDomainUseCase(
            mockDnsResolver,
            mockPublicHostAddress,
            mockCloudflareRanges,
            host,
        );

    it('delegates the resolution of the host to the resolver', async () => {
        mockDnsResolver.resolveAddresses.mockResolvedValue(['203.0.113.10']);
        mockPublicHostAddress.read.mockResolvedValue('203.0.113.10');

        await run('gitpaas.example.com');

        expect(mockDnsResolver.resolveAddresses).toHaveBeenCalledTimes(1);
        expect(mockDnsResolver.resolveAddresses).toHaveBeenCalledWith('gitpaas.example.com');
        expect(mockPublicHostAddress.read).toHaveBeenCalledTimes(1);
        expect(mockCloudflareRanges.readRanges).toHaveBeenCalledTimes(1);
    });

    it('reports that the host points at this host when the addresses meet', async () => {
        mockDnsResolver.resolveAddresses.mockResolvedValue(['203.0.113.10']);
        mockPublicHostAddress.read.mockResolvedValue('203.0.113.10');

        const result = await run('gitpaas.example.com');

        expect(result).toEqual({
            host: 'gitpaas.example.com',
            resolvedAddresses: ['203.0.113.10'],
            hostAddress: '203.0.113.10',
            pointsAtHost: true,
            provider: null,
            reason: null,
        });
    });

    it('reports that the host points at this host when one address of several meets', async () => {
        mockDnsResolver.resolveAddresses.mockResolvedValue(['198.51.100.7', '203.0.113.10']);
        mockPublicHostAddress.read.mockResolvedValue('203.0.113.10');

        expect((await run('gitpaas.example.com')).pointsAtHost).toBe(true);
    });

    it('reports that the host points elsewhere when no address meets', async () => {
        mockDnsResolver.resolveAddresses.mockResolvedValue(['198.51.100.7']);
        mockPublicHostAddress.read.mockResolvedValue('203.0.113.10');

        const result = await run('gitpaas.example.com');

        expect(result.pointsAtHost).toBe(false);
        expect(result.resolvedAddresses).toEqual(['198.51.100.7']);
        expect(result.reason).toBe('mismatch');
    });

    it('reports that the host points elsewhere when it resolves to no address', async () => {
        mockDnsResolver.resolveAddresses.mockResolvedValue([]);
        mockPublicHostAddress.read.mockResolvedValue('203.0.113.10');

        const result = await run('gitpaas.example.com');

        expect(result.pointsAtHost).toBe(false);
        expect(result.resolvedAddresses).toEqual([]);
        expect(result.reason).toBe('no-resolution');
    });

    it('reports no address of this host when the source reads none', async () => {
        mockDnsResolver.resolveAddresses.mockResolvedValue(['203.0.113.10']);
        mockPublicHostAddress.read.mockResolvedValue(null);

        const result = await run('gitpaas.example.com');

        expect(result.hostAddress).toBeNull();
        expect(result.pointsAtHost).toBe(false);
        expect(result.reason).toBe('host-address-unknown');
    });

    it('names no reason while the host points at this host', async () => {
        mockDnsResolver.resolveAddresses.mockResolvedValue(['203.0.113.10']);
        mockPublicHostAddress.read.mockResolvedValue('203.0.113.10');

        expect((await run('gitpaas.example.com')).reason).toBeNull();
    });

    it('names the provider of the CDN that publishes the range of the resolved address', async () => {
        mockDnsResolver.resolveAddresses.mockResolvedValue(['104.16.0.1']);
        mockPublicHostAddress.read.mockResolvedValue('203.0.113.10');
        mockCloudflareRanges.readRanges.mockResolvedValue(['104.16.0.0/13']);

        const result = await run('gitpaas.example.com');

        expect(result.provider).toBe(CLOUDFLARE_PROVIDER_NAME);
        expect(result.reason).toBe('cdn');
    });

    it('names the provider of the first resolved address a range carries', async () => {
        mockDnsResolver.resolveAddresses.mockResolvedValue(['198.51.100.7', '104.16.0.1']);
        mockPublicHostAddress.read.mockResolvedValue('203.0.113.10');
        mockCloudflareRanges.readRanges.mockResolvedValue(['104.16.0.0/13']);

        expect((await run('gitpaas.example.com')).provider).toBe(CLOUDFLARE_PROVIDER_NAME);
    });

    it('names no provider when the ranges carry no resolved address', async () => {
        mockDnsResolver.resolveAddresses.mockResolvedValue(['198.51.100.7']);
        mockPublicHostAddress.read.mockResolvedValue('203.0.113.10');
        mockCloudflareRanges.readRanges.mockResolvedValue(['104.16.0.0/13']);

        expect((await run('gitpaas.example.com')).provider).toBeNull();
    });

    it('names no provider when the source of the ranges reads none', async () => {
        mockDnsResolver.resolveAddresses.mockResolvedValue(['104.16.0.1']);
        mockPublicHostAddress.read.mockResolvedValue('203.0.113.10');
        mockCloudflareRanges.readRanges.mockResolvedValue([]);

        const result = await run('gitpaas.example.com');

        expect(result.provider).toBeNull();
        expect(result.reason).toBe('mismatch');
    });

    it('names the unknown address of this host before the empty resolution', async () => {
        mockDnsResolver.resolveAddresses.mockResolvedValue([]);
        mockPublicHostAddress.read.mockResolvedValue(null);

        expect((await run('gitpaas.example.com')).reason).toBe('host-address-unknown');
    });

    it('propagates errors thrown by the source of the ranges of the CDN', async () => {
        const error = new Error('the source is down');
        mockDnsResolver.resolveAddresses.mockResolvedValue(['203.0.113.10']);
        mockPublicHostAddress.read.mockResolvedValue('203.0.113.10');
        mockCloudflareRanges.readRanges.mockRejectedValue(error);

        await expect(run('gitpaas.example.com')).rejects.toThrow(error);
    });

    it('propagates errors thrown by the resolver', async () => {
        const error = new Error('the resolver is down');
        mockDnsResolver.resolveAddresses.mockRejectedValue(error);
        mockPublicHostAddress.read.mockResolvedValue('203.0.113.10');

        await expect(run('gitpaas.example.com')).rejects.toThrow(error);
    });

    it('propagates errors thrown by the source of the address of this host', async () => {
        const error = new Error('the source is down');
        mockDnsResolver.resolveAddresses.mockResolvedValue(['203.0.113.10']);
        mockPublicHostAddress.read.mockRejectedValue(error);

        await expect(run('gitpaas.example.com')).rejects.toThrow(error);
    });
});
