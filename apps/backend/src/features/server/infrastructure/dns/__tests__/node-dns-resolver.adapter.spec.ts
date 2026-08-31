import { resolve4 } from 'node:dns/promises';

import { NodeDnsResolverAdapter } from '../node-dns-resolver.adapter';

import { NestLoggerAdapter } from '@core/infrastructure/logging/nest-logger.adapter';

jest.mock('node:dns/promises', () => ({ resolve4: jest.fn() }));

/**
 * Resolver of the addresses of IPv4, mocked so a host that resolves nowhere can be exercised.
 */
const mockResolve4 = resolve4 as unknown as jest.MockedFunction<(host: string) => Promise<string[]>>;

describe('NodeDnsResolverAdapter', () => {
    let mockLogger: jest.Mocked<Pick<NestLoggerAdapter, 'warn'>>;
    let sut: NodeDnsResolverAdapter;

    beforeEach(() => {
        jest.clearAllMocks();

        mockLogger = { warn: jest.fn() };
        sut = new NodeDnsResolverAdapter(mockLogger as unknown as NestLoggerAdapter);
    });

    describe('resolveAddresses', () => {
        it('delegates the resolution of the host to the resolver of the platform', async () => {
            mockResolve4.mockResolvedValue(['203.0.113.10']);

            await sut.resolveAddresses('gitpaas.example.com');

            expect(mockResolve4).toHaveBeenCalledTimes(1);
            expect(mockResolve4).toHaveBeenCalledWith('gitpaas.example.com');
        });

        it('returns every address the host resolves to', async () => {
            mockResolve4.mockResolvedValue(['203.0.113.10', '198.51.100.7']);

            expect(await sut.resolveAddresses('gitpaas.example.com')).toEqual(['203.0.113.10', '198.51.100.7']);
        });

        it('returns no address when the host resolves to none', async () => {
            mockResolve4.mockResolvedValue([]);

            expect(await sut.resolveAddresses('gitpaas.example.com')).toEqual([]);
        });

        it('returns no address when the resolution fails', async () => {
            mockResolve4.mockRejectedValue(new Error('queryA ENOTFOUND gitpaas.example.com'));

            expect(await sut.resolveAddresses('gitpaas.example.com')).toEqual([]);
        });

        it('logs the reason a resolution fails', async () => {
            mockResolve4.mockRejectedValue(new Error('queryA ENOTFOUND gitpaas.example.com'));

            await sut.resolveAddresses('gitpaas.example.com');

            expect(mockLogger.warn).toHaveBeenCalledTimes(1);
            expect(mockLogger.warn).toHaveBeenCalledWith(
                'Could not resolve gitpaas.example.com: queryA ENOTFOUND gitpaas.example.com',
                'NodeDnsResolverAdapter',
            );
        });

        it('logs a failure that is no error', async () => {
            mockResolve4.mockRejectedValue('the resolver went away');

            await sut.resolveAddresses('gitpaas.example.com');

            expect(mockLogger.warn).toHaveBeenCalledWith(
                'Could not resolve gitpaas.example.com: the resolver went away',
                'NodeDnsResolverAdapter',
            );
        });

        it('never logs when the resolution succeeds', async () => {
            mockResolve4.mockResolvedValue(['203.0.113.10']);

            await sut.resolveAddresses('gitpaas.example.com');

            expect(mockLogger.warn).not.toHaveBeenCalled();
        });
    });
});
