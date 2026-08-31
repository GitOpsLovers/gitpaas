import { LATEST_RELEASE_TIMEOUT_MS, LATEST_RELEASE_URL } from '../../../domain/constants/platform-update.constants';
import { ReleaseSourceUnavailableError } from '../../../domain/errors/server.errors';
import { GithubReleaseSourceAdapter } from '../github-release-source.adapter';

/** Builds the answer of GitHub the adapter reads. */
const answer = (status: number, body: unknown): Response => ({
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
} as unknown as Response);

describe('GithubReleaseSourceAdapter', () => {
    let mockFetch: jest.SpyInstance;
    let sut: GithubReleaseSourceAdapter;

    beforeEach(() => {
        jest.clearAllMocks();

        mockFetch = jest.spyOn(globalThis, 'fetch').mockResolvedValue(answer(200, { tag_name: 'v2.2.0' }));
        sut = new GithubReleaseSourceAdapter();
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
        const timeout = jest.spyOn(AbortSignal, 'timeout');

        await sut.findLatestRelease();

        expect(timeout).toHaveBeenCalledWith(LATEST_RELEASE_TIMEOUT_MS);
        expect(mockFetch.mock.calls[0][1]).toEqual(expect.objectContaining({ signal: expect.anything() }));
    });

    it('throws a ReleaseSourceUnavailableError when GitHub refuses the read', async () => {
        mockFetch.mockResolvedValue(answer(403, {}));

        await expect(sut.findLatestRelease()).rejects.toBeInstanceOf(ReleaseSourceUnavailableError);
    });

    it('names the status GitHub answered in the failure it reports', async () => {
        mockFetch.mockResolvedValue(answer(403, {}));

        await expect(sut.findLatestRelease())
            .rejects.toThrow('Could not read the latest release of GitPaaS: GitHub answered 403. Try again in a moment.');
    });

    it('throws a ReleaseSourceUnavailableError when GitHub does not answer', async () => {
        mockFetch.mockRejectedValue(new Error('network unreachable'));

        await expect(sut.findLatestRelease())
            .rejects.toThrow('Could not read the latest release of GitPaaS: network unreachable. Try again in a moment.');
    });

    it('chains the failure of the network as the cause of the error it throws', async () => {
        const network = new Error('network unreachable');

        mockFetch.mockRejectedValue(network);

        const error = await sut.findLatestRelease().catch((caught: unknown) => caught);

        expect((error as ReleaseSourceUnavailableError).cause).toBe(network);
    });

    it('throws a ReleaseSourceUnavailableError when the body of the answer is no JSON', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            status: 200,
            json: jest.fn().mockRejectedValue(new Error('unexpected token')),
        });

        await expect(sut.findLatestRelease()).rejects.toBeInstanceOf(ReleaseSourceUnavailableError);
    });

    it('returns null when the answer carries no tag, because the source publishes no release', async () => {
        mockFetch.mockResolvedValue(answer(200, {}));

        expect(await sut.findLatestRelease()).toBeNull();
    });
});
