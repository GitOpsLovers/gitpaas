import { resolve4, resolve6 } from 'node:dns/promises';

import { NodeDnsResolverAdapter } from '../node-dns-resolver.adapter';

import { NestLoggerAdapter } from '@core/infrastructure/logging/nest-logger.adapter';

jest.mock('node:dns/promises', () => ({ resolve4: jest.fn(), resolve6: jest.fn() }));

/**
 * Resolver of the record A, mocked so a host that resolves nowhere can be exercised.
 */
const mockResolve4 = resolve4 as unknown as jest.MockedFunction<(host: string) => Promise<string[]>>;

/**
 * Resolver of the record AAAA, mocked so a host that carries no record of IPv6 can be exercised.
 */
const mockResolve6 = resolve6 as unknown as jest.MockedFunction<(host: string) => Promise<string[]>>;

describe('NodeDnsResolverAdapter', () => {
    let mockLogger: jest.Mocked<Pick<NestLoggerAdapter, 'warn'>>;
    let sut: NodeDnsResolverAdapter;

    beforeEach(() => {
        jest.clearAllMocks();

        mockResolve4.mockResolvedValue([]);
        mockResolve6.mockResolvedValue([]);

        mockLogger = { warn: jest.fn() };
        sut = new NodeDnsResolverAdapter(mockLogger as unknown as NestLoggerAdapter);
    });

    describe('resolveAddresses', () => {
        it('delegates the resolution of the records A and AAAA to the resolver of the platform', async () => {
            await sut.resolveAddresses('gitpaas.example.com');

            expect(mockResolve4).toHaveBeenCalledTimes(1);
            expect(mockResolve4).toHaveBeenCalledWith('gitpaas.example.com');
            expect(mockResolve6).toHaveBeenCalledTimes(1);
            expect(mockResolve6).toHaveBeenCalledWith('gitpaas.example.com');
        });

        it('returns the record A ahead of the record AAAA in one list', async () => {
            mockResolve4.mockResolvedValue(['203.0.113.10', '198.51.100.7']);
            mockResolve6.mockResolvedValue(['2001:db8::1']);

            expect(await sut.resolveAddresses('gitpaas.example.com')).toEqual([
                '203.0.113.10',
                '198.51.100.7',
                '2001:db8::1',
            ]);
        });

        it('returns the record A alone when the host carries no record AAAA', async () => {
            mockResolve4.mockResolvedValue(['203.0.113.10']);
            mockResolve6.mockRejectedValue(new Error('queryAaaa ENODATA gitpaas.example.com'));

            expect(await sut.resolveAddresses('gitpaas.example.com')).toEqual(['203.0.113.10']);
        });

        it('returns the record AAAA alone when the host carries no record A', async () => {
            mockResolve4.mockRejectedValue(new Error('queryA ENODATA gitpaas.example.com'));
            mockResolve6.mockResolvedValue(['2001:db8::1']);

            expect(await sut.resolveAddresses('gitpaas.example.com')).toEqual(['2001:db8::1']);
        });

        it('returns no address when the host resolves to none', async () => {
            expect(await sut.resolveAddresses('gitpaas.example.com')).toEqual([]);
        });

        it('returns no address when both resolutions fail', async () => {
            mockResolve4.mockRejectedValue(new Error('queryA ENOTFOUND gitpaas.example.com'));
            mockResolve6.mockRejectedValue(new Error('queryAaaa ENOTFOUND gitpaas.example.com'));

            expect(await sut.resolveAddresses('gitpaas.example.com')).toEqual([]);
        });

        it('logs the reason each resolution fails, and names the record', async () => {
            mockResolve4.mockRejectedValue(new Error('queryA ENOTFOUND gitpaas.example.com'));
            mockResolve6.mockRejectedValue(new Error('queryAaaa ENOTFOUND gitpaas.example.com'));

            await sut.resolveAddresses('gitpaas.example.com');

            expect(mockLogger.warn).toHaveBeenCalledTimes(2);
            expect(mockLogger.warn).toHaveBeenCalledWith(
                'Could not resolve the record A of gitpaas.example.com: queryA ENOTFOUND gitpaas.example.com',
                'NodeDnsResolverAdapter',
            );
            expect(mockLogger.warn).toHaveBeenCalledWith(
                'Could not resolve the record AAAA of gitpaas.example.com: queryAaaa ENOTFOUND gitpaas.example.com',
                'NodeDnsResolverAdapter',
            );
        });

        it('logs a failure that is no error', async () => {
            mockResolve4.mockRejectedValue('the resolver went away');

            await sut.resolveAddresses('gitpaas.example.com');

            expect(mockLogger.warn).toHaveBeenCalledWith(
                'Could not resolve the record A of gitpaas.example.com: the resolver went away',
                'NodeDnsResolverAdapter',
            );
        });

        it('never logs when both resolutions succeed', async () => {
            mockResolve4.mockResolvedValue(['203.0.113.10']);
            mockResolve6.mockResolvedValue(['2001:db8::1']);

            await sut.resolveAddresses('gitpaas.example.com');

            expect(mockLogger.warn).not.toHaveBeenCalled();
        });
    });
});
