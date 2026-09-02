import {
    CLOUDFLARE_IPV4_RANGES_URL,
    CLOUDFLARE_IPV6_RANGES_URL,
    CLOUDFLARE_RANGES_CACHE_TTL_MS,
    CLOUDFLARE_RANGES_TIMEOUT_MS,
} from '../../../domain/constants/cloudflare-ranges.constants';
import { CloudflareRangesAdapter } from '../cloudflare-ranges.adapter';

import { NestLoggerAdapter } from '@core/infrastructure/logging/nest-logger.adapter';

/** Builds the answer of Cloudflare the adapter reads. */
const answer = (status: number, body: string): Response => ({
    ok: status >= 200 && status < 300,
    status,
    text: jest.fn().mockResolvedValue(body),
} as unknown as Response);

/** Answers each list of Cloudflare with the body of its own kind of address. */
const bothLists = (ipv4: string, ipv6: string) => (url: string): Promise<Response> =>
    Promise.resolve(answer(200, url === CLOUDFLARE_IPV4_RANGES_URL ? ipv4 : ipv6));

describe('CloudflareRangesAdapter', () => {
    let mockFetch: jest.SpyInstance;
    let mockLogger: jest.Mocked<Pick<NestLoggerAdapter, 'warn'>>;
    let sut: CloudflareRangesAdapter;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2026-09-02T10:00:00.000Z'));

        mockFetch = jest.spyOn(globalThis, 'fetch')
            .mockImplementation(bothLists('173.245.48.0/20', '2400:cb00::/32') as never);

        mockLogger = { warn: jest.fn() };
        sut = new CloudflareRangesAdapter(mockLogger as unknown as NestLoggerAdapter);
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    describe('readRanges', () => {
        it('reads the two lists of ranges Cloudflare publishes', async () => {
            await sut.readRanges();

            expect(mockFetch).toHaveBeenCalledTimes(2);
            expect(mockFetch).toHaveBeenCalledWith(CLOUDFLARE_IPV4_RANGES_URL, expect.anything());
            expect(mockFetch).toHaveBeenCalledWith(CLOUDFLARE_IPV6_RANGES_URL, expect.anything());
        });

        it('returns the ranges IPv4 ahead of the ranges IPv6 in one list', async () => {
            mockFetch.mockImplementation(bothLists('173.245.48.0/20\n103.21.244.0/22', '2400:cb00::/32') as never);

            expect(await sut.readRanges()).toEqual(['173.245.48.0/20', '103.21.244.0/22', '2400:cb00::/32']);
        });

        it('drops the empty line and the surrounding blank of a body of Cloudflare', async () => {
            mockFetch.mockImplementation(bothLists('  173.245.48.0/20  \n\n', '2400:cb00::/32\n') as never);

            expect(await sut.readRanges()).toEqual(['173.245.48.0/20', '2400:cb00::/32']);
        });

        it('gives up each read after a bounded wait', async () => {
            const timeout = jest.spyOn(AbortSignal, 'timeout');

            await sut.readRanges();

            expect(timeout).toHaveBeenCalledWith(CLOUDFLARE_RANGES_TIMEOUT_MS);
            expect(mockFetch.mock.calls[0][1]).toEqual(expect.objectContaining({ signal: expect.anything() }));
        });

        it('returns no range when Cloudflare does not answer, and never throws', async () => {
            mockFetch.mockRejectedValue(new Error('network unreachable'));

            expect(await sut.readRanges()).toEqual([]);
        });

        it('returns no range when Cloudflare refuses the read', async () => {
            mockFetch.mockResolvedValue(answer(503, ''));

            expect(await sut.readRanges()).toEqual([]);
        });

        it('returns the list it could read when the other one fails', async () => {
            mockFetch.mockImplementation(((url: string) => url === CLOUDFLARE_IPV4_RANGES_URL
                ? Promise.resolve(answer(200, '173.245.48.0/20'))
                : Promise.reject(new Error('network unreachable'))) as never);

            expect(await sut.readRanges()).toEqual(['173.245.48.0/20']);
        });

        it('logs the reason a read of a list fails, and names the list', async () => {
            mockFetch.mockRejectedValue(new Error('network unreachable'));

            await sut.readRanges();

            expect(mockLogger.warn).toHaveBeenCalledTimes(2);
            expect(mockLogger.warn).toHaveBeenCalledWith(
                `Could not read the ranges of Cloudflare at ${CLOUDFLARE_IPV4_RANGES_URL}: network unreachable`,
                'CloudflareRangesAdapter',
            );
            expect(mockLogger.warn).toHaveBeenCalledWith(
                `Could not read the ranges of Cloudflare at ${CLOUDFLARE_IPV6_RANGES_URL}: network unreachable`,
                'CloudflareRangesAdapter',
            );
        });

        it('logs the status Cloudflare answered when it refuses a read', async () => {
            mockFetch.mockResolvedValue(answer(503, ''));

            await sut.readRanges();

            expect(mockLogger.warn).toHaveBeenCalledWith(
                `Could not read the ranges of Cloudflare at ${CLOUDFLARE_IPV4_RANGES_URL}: Cloudflare answered 503`,
                'CloudflareRangesAdapter',
            );
        });

        it('logs a failure that is no error', async () => {
            mockFetch.mockRejectedValue('the network went away');

            await sut.readRanges();

            expect(mockLogger.warn).toHaveBeenCalledWith(
                `Could not read the ranges of Cloudflare at ${CLOUDFLARE_IPV4_RANGES_URL}: the network went away`,
                'CloudflareRangesAdapter',
            );
        });

        it('never logs when both lists answer', async () => {
            await sut.readRanges();

            expect(mockLogger.warn).not.toHaveBeenCalled();
        });

        it('reads Cloudflare one time for the calls that follow inside the life of the cache', async () => {
            await sut.readRanges();
            jest.advanceTimersByTime(CLOUDFLARE_RANGES_CACHE_TTL_MS - 1);

            expect(await sut.readRanges()).toEqual(['173.245.48.0/20', '2400:cb00::/32']);
            expect(mockFetch).toHaveBeenCalledTimes(2);
        });

        it('reads Cloudflare again once the cache is older than its life', async () => {
            await sut.readRanges();
            jest.advanceTimersByTime(CLOUDFLARE_RANGES_CACHE_TTL_MS);

            await sut.readRanges();

            expect(mockFetch).toHaveBeenCalledTimes(4);
        });

        it('reads Cloudflare again when the previous read failed, because a failure is never kept', async () => {
            mockFetch.mockRejectedValue(new Error('network unreachable'));
            await sut.readRanges();

            await sut.readRanges();

            expect(mockFetch).toHaveBeenCalledTimes(4);
        });

        it('reads Cloudflare again when the previous read carried one list alone', async () => {
            mockFetch.mockImplementation(((url: string) => url === CLOUDFLARE_IPV4_RANGES_URL
                ? Promise.resolve(answer(200, '173.245.48.0/20'))
                : Promise.reject(new Error('network unreachable'))) as never);
            await sut.readRanges();

            await sut.readRanges();

            expect(mockFetch).toHaveBeenCalledTimes(4);
        });
    });
});
