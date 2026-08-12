import {
    SourceControlAuthenticationError,
    SourceControlRateLimitedError,
    SourceControlResourceNotFoundError,
    SourceControlUnavailableError,
} from '../../domain/errors/source-control.errors';
import { GitBranch } from '../../domain/models/git-branch.models';
import { GitCommit } from '../../domain/models/git-commit.models';
import { GitRepository } from '../../domain/models/git-repository.models';

import { DomainError } from '@core/domain/errors/domain.error';

/**
 * Node/undici error codes that mean GitHub could not be reached at all.
 */
const NETWORK_ERROR_CODES = new Set([
    'ECONNREFUSED',
    'ECONNRESET',
    'ENOTFOUND',
    'EAI_AGAIN',
    'ETIMEDOUT',
    'EPIPE',
    'UND_ERR_CONNECT_TIMEOUT',
    'UND_ERR_SOCKET',
]);

/**
 * HTTP status GitHub answers when the installation's quota is exhausted.
 */
const TOO_MANY_REQUESTS = 429;

/**
 * Reads the HTTP status carried by an Octokit `RequestError`.
 *
 * @param error Caught error
 *
 * @returns Status code, or `undefined` when the error carries none
 */
function readStatus(error: unknown): number | undefined {
    const status = (error as { status?: unknown } | null)?.status;

    return typeof status === 'number' ? status : undefined;
}

/**
 * Tells whether GitHub refused the request because the rate limit is exhausted.
 *
 * @param error Caught error
 *
 * @returns `true` when the failure is a rate limit
 */
function isRateLimited(error: unknown): boolean {
    const headers = (error as { response?: { headers?: Record<string, unknown> } | null } | null)
        ?.response?.headers;

    return headers?.['x-ratelimit-remaining'] === '0';
}

/**
 * Tells whether the request never reached GitHub (DNS, TCP, timeout).
 *
 * @param error Caught error
 *
 * @returns `true` when the failure is a network failure
 */
function isNetworkFailure(error: unknown): boolean {
    const code = (error as { code?: unknown } | null)?.code;

    return typeof code === 'string' && NETWORK_ERROR_CODES.has(code);
}

/**
 * Maps a failure raised by Octokit into the domain error that describes it.
 *
 * @param error Caught error
 *
 * @returns The domain error to throw, or the original error when unclassifiable
 */
export function toSourceControlError(error: unknown): unknown {
    if (error instanceof DomainError) {
        return error;
    }

    if (isNetworkFailure(error)) {
        return new SourceControlUnavailableError({ cause: error });
    }

    const status = readStatus(error);

    if (status === undefined) {
        return error;
    }

    if (status >= 500) {
        return new SourceControlUnavailableError({ cause: error });
    }

    if (status === TOO_MANY_REQUESTS || (status === 403 && isRateLimited(error))) {
        return new SourceControlRateLimitedError({ cause: error });
    }

    if (status === 401 || status === 403) {
        return new SourceControlAuthenticationError({ cause: error });
    }

    if (status === 404) {
        return new SourceControlResourceNotFoundError({ cause: error });
    }

    return error;
}

/**
 * Maps a GitHub repository payload into the domain model.
 *
 * @param repository GitHub repository payload
 *
 * @returns Domain git repository
 */
export function toGitRepository(repository: {
    id: number;
    full_name: string;
    default_branch: string;
    private: boolean;
}): GitRepository {
    return {
        id: repository.id,
        fullName: repository.full_name,
        defaultBranch: repository.default_branch,
        private: repository.private,
    };
}

/**
 * Maps a GitHub branch payload into the domain model.
 *
 * @param branch GitHub branch payload
 *
 * @returns Domain git branch
 */
export function toGitBranch(branch: { name: string }): GitBranch {
    return { name: branch.name };
}

/**
 * Maps a GitHub commit payload into the domain model.
 *
 * @param commit GitHub commit payload
 *
 * @returns Domain git commit
 */
export function toGitCommit(commit: { sha: string; commit: { message: string } }): GitCommit {
    return { sha: commit.sha, message: commit.commit.message };
}
