import { PUBLIC_ADDRESS_URL } from '../../../domain/constants/platform-settings.constants';
import { HttpPublicHostAddressAdapter } from '../http-public-host-address.adapter';

import type { AppLogger } from '@core/domain/ports/app-logger.port';

/** Builds the answer of the service of the address the adapter reads. */
const answer = (status: number, body: string): Response => ({
    ok: status >= 200 && status < 300,
    status,
    text: jest.fn().mockResolvedValue(body),
} as unknown as Response);

describe('HttpPublicHostAddressAdapter', () => {
    let mockFetch: jest.SpyInstance;
    let mockLogger: jest.Mocked<AppLogger>;
    let sut: HttpPublicHostAddressAdapter;

    beforeEach(() => {
        jest.clearAllMocks();

        mockFetch = jest.spyOn(globalThis, 'fetch').mockResolvedValue(answer(200, '203.0.113.10'));
        mockLogger = {
            debug: jest.fn(), log: jest.fn(), warn: jest.fn(), error: jest.fn(),
        };
        sut = new HttpPublicHostAddressAdapter(mockLogger);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('read', () => {
        it('asks the service of the address for the address of this host', async () => {
            await sut.read();

            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(mockFetch).toHaveBeenCalledWith(PUBLIC_ADDRESS_URL, expect.anything());
        });

        it('gives up the read after a bounded wait', async () => {
            await sut.read();

            expect(mockFetch.mock.calls[0][1]).toEqual(expect.objectContaining({ signal: expect.anything() }));
        });

        it('returns the address the service answers', async () => {
            expect(await sut.read()).toBe('203.0.113.10');
        });

        it('drops the whitespace around the address', async () => {
            mockFetch.mockResolvedValue(answer(200, ' 203.0.113.10\n'));

            expect(await sut.read()).toBe('203.0.113.10');
        });

        it('returns null when the service answers an empty body', async () => {
            mockFetch.mockResolvedValue(answer(200, '  '));

            expect(await sut.read()).toBeNull();
        });

        it('returns null, and warns, when the service refuses the read', async () => {
            mockFetch.mockResolvedValue(answer(503, ''));

            expect(await sut.read()).toBeNull();
            expect(mockLogger.warn).toHaveBeenCalledWith(
                'The address service answered 503 to the read of the address of this host',
                'HttpPublicHostAddressAdapter',
            );
        });

        it('returns null, and warns, when the read fails', async () => {
            mockFetch.mockRejectedValue(new Error('The operation was aborted'));

            expect(await sut.read()).toBeNull();
            expect(mockLogger.warn).toHaveBeenCalledWith(
                'Could not read the public address of this host: The operation was aborted',
                'HttpPublicHostAddressAdapter',
            );
        });

        it('warns with a failure that is no error', async () => {
            mockFetch.mockRejectedValue('the network went away');

            expect(await sut.read()).toBeNull();
            expect(mockLogger.warn).toHaveBeenCalledWith(
                'Could not read the public address of this host: the network went away',
                'HttpPublicHostAddressAdapter',
            );
        });

        it('never warns when the read succeeds', async () => {
            await sut.read();

            expect(mockLogger.warn).not.toHaveBeenCalled();
        });
    });
});
