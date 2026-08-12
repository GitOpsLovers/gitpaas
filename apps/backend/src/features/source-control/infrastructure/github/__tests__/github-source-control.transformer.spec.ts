import {
    SourceControlAuthenticationError,
    SourceControlNotConfiguredError,
    SourceControlRateLimitedError,
    SourceControlResourceNotFoundError,
    SourceControlUnavailableError,
} from '../../../domain/errors/source-control.errors';
import {
    toGitBranch, toGitCommit, toGitRepository, toSourceControlError,
} from '../github-source-control.transformer';

/**
 * Builds a stand-in for an Octokit `RequestError`: a plain `Error` carrying the
 * `status` and the response headers the real one exposes.
 */
const requestError = (status: number, headers: Record<string, string> = {}): Error =>
    Object.assign(new Error('secret octokit detail'), { status, response: { headers } });

/** Builds a stand-in for a Node socket failure, which carries a `code`. */
const networkError = (code: string): Error => Object.assign(new Error('fetch failed'), { code });

describe('github-source-control.transformer', () => {
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

    describe('toSourceControlError', () => {
        it('returns a domain error untouched', () => {
            const error = new SourceControlNotConfiguredError();

            expect(toSourceControlError(error)).toBe(error);
        });

        it('maps a socket failure to SourceControlUnavailableError', () => {
            expect(toSourceControlError(networkError('ECONNREFUSED')))
                .toBeInstanceOf(SourceControlUnavailableError);
        });

        it('maps a DNS failure to SourceControlUnavailableError', () => {
            expect(toSourceControlError(networkError('ENOTFOUND')))
                .toBeInstanceOf(SourceControlUnavailableError);
        });

        it('maps a GitHub 500 to SourceControlUnavailableError', () => {
            expect(toSourceControlError(requestError(500))).toBeInstanceOf(SourceControlUnavailableError);
        });

        it('maps a GitHub 503 to SourceControlUnavailableError', () => {
            expect(toSourceControlError(requestError(503))).toBeInstanceOf(SourceControlUnavailableError);
        });

        it('maps a 429 to SourceControlRateLimitedError', () => {
            expect(toSourceControlError(requestError(429))).toBeInstanceOf(SourceControlRateLimitedError);
        });

        it('maps a 403 with an exhausted quota to SourceControlRateLimitedError', () => {
            const error = requestError(403, { 'x-ratelimit-remaining': '0' });

            expect(toSourceControlError(error)).toBeInstanceOf(SourceControlRateLimitedError);
        });

        it('maps a 403 with quota left to SourceControlAuthenticationError', () => {
            const error = requestError(403, { 'x-ratelimit-remaining': '4999' });

            expect(toSourceControlError(error)).toBeInstanceOf(SourceControlAuthenticationError);
        });

        it('maps a 401 to SourceControlAuthenticationError', () => {
            expect(toSourceControlError(requestError(401))).toBeInstanceOf(SourceControlAuthenticationError);
        });

        it('maps a 404 to SourceControlResourceNotFoundError', () => {
            expect(toSourceControlError(requestError(404))).toBeInstanceOf(SourceControlResourceNotFoundError);
        });

        it('chains the original failure as the cause', () => {
            const original = requestError(404);

            expect((toSourceControlError(original) as Error).cause).toBe(original);
        });

        it('never republishes the Octokit message', () => {
            const translated = toSourceControlError(requestError(404)) as Error;

            expect(translated.message).not.toContain('secret octokit detail');
        });

        it('returns an unclassifiable status untouched, so the filter answers 500', () => {
            const error = requestError(422);

            expect(toSourceControlError(error)).toBe(error);
        });

        it('returns an error without a status untouched', () => {
            const error = new Error('boom');

            expect(toSourceControlError(error)).toBe(error);
        });

        it('returns a non-Error thrown value untouched', () => {
            expect(toSourceControlError('boom')).toBe('boom');
        });

        it('returns null untouched', () => {
            expect(toSourceControlError(null)).toBeNull();
        });
    });
});
