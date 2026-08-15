import {
    ProviderAuthenticationError,
    ProviderNotConfiguredError,
    ProviderRateLimitedError,
    ProviderResourceNotFoundError,
    ProviderUnavailableError,
} from '../../../domain/errors/provider-client.errors';
import {
    toGitBranch, toGitCommit, toGitRepository, toProviderClientError,
} from '../github-provider-client.transformer';

/**
 * Builds a stand-in for an Octokit `RequestError`: a plain `Error` carrying the
 * `status` and the response headers the real one exposes.
 */
const requestError = (status: number, headers: Record<string, string> = {}): Error =>
    Object.assign(new Error('secret octokit detail'), { status, response: { headers } });

/** Builds a stand-in for a Node socket failure, which carries a `code`. */
const networkError = (code: string): Error => Object.assign(new Error('fetch failed'), { code });

describe('github-provider-client.transformer', () => {
    describe('toGitRepository', () => {
        it('maps a GitHub repository payload into the domain model', () => {
            expect(
                toGitRepository({
                    id: 42,
                    full_name: 'gitopslovers/gitpaas',
                    default_branch: 'main',
                    private: true,
                }),
            ).toEqual({
                id: 42,
                fullName: 'gitopslovers/gitpaas',
                defaultBranch: 'main',
                private: true,
            });
        });

        it('preserves a public repository flag', () => {
            const result = toGitRepository({
                id: 7,
                full_name: 'octocat/hello-world',
                default_branch: 'master',
                private: false,
            });

            expect(result.private).toBe(false);
            expect(result.defaultBranch).toBe('master');
        });
    });

    describe('toGitBranch', () => {
        it('maps a GitHub branch payload into the domain model', () => {
            expect(toGitBranch({ name: 'feature/logs' })).toEqual({ name: 'feature/logs' });
        });
    });

    describe('toGitCommit', () => {
        it('maps the sha and flattens the nested commit message', () => {
            expect(
                toGitCommit({
                    sha: '2b8c1f0a9e4d7c6b5a4f3e2d1c0b9a8f7e6d5c4b',
                    commit: { message: 'Add logs feature' },
                }),
            ).toEqual({
                sha: '2b8c1f0a9e4d7c6b5a4f3e2d1c0b9a8f7e6d5c4b',
                message: 'Add logs feature',
            });
        });
    });

    describe('toProviderClientError', () => {
        it('returns a domain error untouched', () => {
            const error = new ProviderNotConfiguredError('provider-id');

            expect(toProviderClientError(error)).toBe(error);
        });

        it('maps a socket failure to ProviderUnavailableError', () => {
            expect(toProviderClientError(networkError('ECONNREFUSED')))
                .toBeInstanceOf(ProviderUnavailableError);
        });

        it('maps a DNS failure to ProviderUnavailableError', () => {
            expect(toProviderClientError(networkError('ENOTFOUND')))
                .toBeInstanceOf(ProviderUnavailableError);
        });

        it('maps a GitHub 500 to ProviderUnavailableError', () => {
            expect(toProviderClientError(requestError(500))).toBeInstanceOf(ProviderUnavailableError);
        });

        it('maps a GitHub 503 to ProviderUnavailableError', () => {
            expect(toProviderClientError(requestError(503))).toBeInstanceOf(ProviderUnavailableError);
        });

        it('maps a 429 to ProviderRateLimitedError', () => {
            expect(toProviderClientError(requestError(429))).toBeInstanceOf(ProviderRateLimitedError);
        });

        it('maps a 403 with an exhausted quota to ProviderRateLimitedError', () => {
            const error = requestError(403, { 'x-ratelimit-remaining': '0' });

            expect(toProviderClientError(error)).toBeInstanceOf(ProviderRateLimitedError);
        });

        it('maps a 403 with quota left to ProviderAuthenticationError', () => {
            const error = requestError(403, { 'x-ratelimit-remaining': '4999' });

            expect(toProviderClientError(error)).toBeInstanceOf(ProviderAuthenticationError);
        });

        it('maps a 401 to ProviderAuthenticationError', () => {
            expect(toProviderClientError(requestError(401))).toBeInstanceOf(ProviderAuthenticationError);
        });

        it('maps a 404 to ProviderResourceNotFoundError', () => {
            expect(toProviderClientError(requestError(404))).toBeInstanceOf(ProviderResourceNotFoundError);
        });

        it('chains the original failure as the cause', () => {
            const original = requestError(404);

            expect((toProviderClientError(original) as Error).cause).toBe(original);
        });

        it('never republishes the Octokit message', () => {
            const translated = toProviderClientError(requestError(404)) as Error;

            expect(translated.message).not.toContain('secret octokit detail');
        });

        it('returns an unclassifiable status untouched, so the filter answers 500', () => {
            const error = requestError(422);

            expect(toProviderClientError(error)).toBe(error);
        });

        it('returns an error without a status untouched', () => {
            const error = new Error('boom');

            expect(toProviderClientError(error)).toBe(error);
        });

        it('returns a non-Error thrown value untouched', () => {
            expect(toProviderClientError('boom')).toBe('boom');
        });

        it('returns null untouched', () => {
            expect(toProviderClientError(null)).toBeNull();
        });
    });
});
