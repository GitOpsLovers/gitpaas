import { LATEST_RELEASE_URL } from '../../../domain/constants/platform-update.constants';
import { GithubReleaseSourceAdapter } from '../github-release-source.adapter';

import type { AppLogger } from '@core/domain/ports/app-logger.port';

/** Builds the answer of GitHub the adapter reads. */
const answer = (status: number, body: unknown): Response => ({
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
} as unknown as Response);

describe('GithubReleaseSourceAdapter', () => {
    let mockFetch: jest.SpyInstance;
    let mockLogger: jest.Mocked<AppLogger>;
    let sut: GithubReleaseSourceAdapter;

    beforeEach(() => {
        jest.clearAllMocks();

        mockFetch = jest.spyOn(globalThis, 'fetch').mockResolvedValue(answer(200, { tag_name: 'v2.2.0' }));
        mockLogger = {
            debug: jest.fn(), log: jest.fn(), warn: jest.fn(), error: jest.fn(),
        };
        sut = new GithubReleaseSourceAdapter(mockLogger);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('reads the latest release of the repository of GitPaaS', async () => {
        await sut.findLatestRelease();

        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(mockFetch).toHaveBeenCalledWith(LATEST_RELEASE_URL, expect.objectContaining({
            headers: { Accept: 'application/vnd.github+json' },
        }));
    });

    it('maps the answer of GitHub into the latest release', async () => {
        expect(await sut.findLatestRelease()).toEqual({ tag: 'v2.2.0', version: '2.2.0' });
    });

    it('gives up the read after a bounded wait', async () => {
        await sut.findLatestRelease();

        expect(mockFetch.mock.calls[0][1]).toEqual(expect.objectContaining({ signal: expect.anything() }));
    });

    it('returns null, and warns, when GitHub refuses the read', async () => {
        mockFetch.mockResolvedValue(answer(403, {}));

        expect(await sut.findLatestRelease()).toBeNull();
        expect(mockLogger.warn).toHaveBeenCalledWith(
            'GitHub answered 403 to the read of the latest release',
            'GithubReleaseSourceAdapter',
        );
    });

    it('returns null when the answer carries no tag', async () => {
        mockFetch.mockResolvedValue(answer(200, {}));

        expect(await sut.findLatestRelease()).toBeNull();
    });

    it('returns null, and warns, when GitHub does not answer', async () => {
        mockFetch.mockRejectedValue(new Error('network unreachable'));

        expect(await sut.findLatestRelease()).toBeNull();
        expect(mockLogger.warn).toHaveBeenCalledWith(
            'Could not read the latest release of GitPaaS: network unreachable',
            'GithubReleaseSourceAdapter',
        );
    });

    it('throws nothing when the body of the answer is no JSON', async () => {
        const broken = { ok: true, status: 200, json: jest.fn().mockRejectedValue(new Error('unexpected token')) };

        mockFetch.mockResolvedValue(broken);

        await expect(sut.findLatestRelease()).resolves.toBeNull();
    });
});
