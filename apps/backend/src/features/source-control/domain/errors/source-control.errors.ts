import { DomainError } from '@core/domain/errors/domain.error';

/**
 * Raised when the GitHub App credentials are missing from the environment, so
 * no client can be built at all. It is our own misconfiguration, never the
 * client's fault, hence a "temporarily unavailable" answer.
 */
export class SourceControlNotConfiguredError extends DomainError {
    /**
     * @param options Standard error options, so `{ cause }` chains the original error
     */
    constructor(options?: ErrorOptions) {
        super(
            'SOURCE_CONTROL_NOT_CONFIGURED',
            'GitHub App is not configured. Set GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY and '
                + 'GITHUB_APP_INSTALLATION_ID in the backend environment.',
            options,
        );
    }
}

/**
 * Raised when GitHub rejects our credentials (an expired private key, a revoked
 * or under-privileged installation). Again our misconfiguration, so the caller
 * is told the integration is unavailable rather than being blamed for it.
 */
export class SourceControlAuthenticationError extends DomainError {
    /**
     * @param options Standard error options, so `{ cause }` chains the original error
     */
    constructor(options?: ErrorOptions) {
        super(
            'SOURCE_CONTROL_AUTHENTICATION_FAILED',
            'The GitHub App could not authenticate with GitHub. Check the installation credentials.',
            options,
        );
    }
}

/**
 * Raised when GitHub refuses the request because the installation's API quota is
 * exhausted. The request may succeed once the quota resets.
 */
export class SourceControlRateLimitedError extends DomainError {
    /**
     * @param options Standard error options, so `{ cause }` chains the original error
     */
    constructor(options?: ErrorOptions) {
        super(
            'SOURCE_CONTROL_RATE_LIMITED',
            'GitHub rate limit exhausted for this installation. Try again later.',
            options,
        );
    }
}

/**
 * Raised when the repository, branch or commit asked for does not exist on
 * GitHub, or is not visible to the installation. This one *is* about what the
 * client asked for, so it becomes a 404.
 */
export class SourceControlResourceNotFoundError extends DomainError {
    /**
     * @param options Standard error options, so `{ cause }` chains the original error
     */
    constructor(options?: ErrorOptions) {
        super(
            'SOURCE_CONTROL_RESOURCE_NOT_FOUND',
            'The requested repository or reference does not exist on GitHub, '
                + 'or is not accessible to the GitHub App installation.',
            options,
        );
    }
}

/**
 * Raised when GitHub is unreachable or answers with a failure of its own (an
 * outage, a network error, a 5xx).
 */
export class SourceControlUnavailableError extends DomainError {
    /**
     * @param options Standard error options, so `{ cause }` chains the original error
     */
    constructor(options?: ErrorOptions) {
        super(
            'SOURCE_CONTROL_UNAVAILABLE',
            'GitHub is unreachable. Try again later.',
            options,
        );
    }
}
