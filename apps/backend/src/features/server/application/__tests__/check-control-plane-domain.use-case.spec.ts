import type { DnsResolver } from '../../domain/ports/dns-resolver.port';
import type { PublicHostAddress } from '../../domain/ports/public-host-address.port';
import { checkControlPlaneDomainUseCase } from '../check-control-plane-domain.use-case';

describe('checkControlPlaneDomainUseCase', () => {
    let mockDnsResolver: jest.Mocked<Pick<DnsResolver, 'resolveAddresses'>>;
    let mockPublicHostAddress: jest.Mocked<Pick<PublicHostAddress, 'read'>>;

    beforeEach(() => {
        jest.clearAllMocks();

        mockDnsResolver = { resolveAddresses: jest.fn() };
        mockPublicHostAddress = { read: jest.fn() };
    });

    /** Runs the use case with the mocked ports, applying the casts one time. */
    const run = (host: string) =>
        checkControlPlaneDomainUseCase(
            mockDnsResolver,
            mockPublicHostAddress,
            host,
        );

    it('delegates the resolution of the host to the resolver', async () => {
        mockDnsResolver.resolveAddresses.mockResolvedValue(['203.0.113.10']);
        mockPublicHostAddress.read.mockResolvedValue('203.0.113.10');

        await run('gitpaas.example.com');

        expect(mockDnsResolver.resolveAddresses).toHaveBeenCalledTimes(1);
        expect(mockDnsResolver.resolveAddresses).toHaveBeenCalledWith('gitpaas.example.com');
        expect(mockPublicHostAddress.read).toHaveBeenCalledTimes(1);
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
    });

    it('reports that the host points elsewhere when it resolves to no address', async () => {
        mockDnsResolver.resolveAddresses.mockResolvedValue([]);
        mockPublicHostAddress.read.mockResolvedValue('203.0.113.10');

        const result = await run('gitpaas.example.com');

        expect(result.pointsAtHost).toBe(false);
        expect(result.resolvedAddresses).toEqual([]);
    });

    it('reports no address of this host when the source reads none', async () => {
        mockDnsResolver.resolveAddresses.mockResolvedValue(['203.0.113.10']);
        mockPublicHostAddress.read.mockResolvedValue(null);

        const result = await run('gitpaas.example.com');

        expect(result.hostAddress).toBeNull();
        expect(result.pointsAtHost).toBe(false);
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
