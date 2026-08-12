import { DomainError } from '@core/domain/errors/domain.error';

/**
 * Raised when source control is not configured in the backend.
 */
export class SourceControlNotConfiguredError extends DomainError {
    constructor(options?: ErrorOptions) {
        super(
            'SOURCE_CONTROL_NOT_CONFIGURED',
            'GitHub App is not configured. Set GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY and GITHUB_APP_INSTALLATION_ID in the backend environment.',
            options,
        );
    }
}

/**
 * Raised when source control rejects our credentials.
 */
export class SourceControlAuthenticationError extends DomainError {
    constructor(options?: ErrorOptions) {
        super(
            'SOURCE_CONTROL_AUTHENTICATION_FAILED',
            'The GitHub App could not authenticate with GitHub. Check the installation credentials.',
            options,
        );
    }
}

/**
 * Raised when source control refuses the request because the installation's API quota is exhausted.
 */
export class SourceControlRateLimitedError extends DomainError {
    constructor(options?: ErrorOptions) {
        super(
            'SOURCE_CONTROL_RATE_LIMITED',
            'GitHub rate limit exhausted for this installation. Try again later.',
            options,
        );
    }
}

/**
 * Raised when the repository, branch or commit asked for does not exist on source control, or is not visible to the installation.
 */
export class SourceControlResourceNotFoundError extends DomainError {
    constructor(options?: ErrorOptions) {
        super(
            'SOURCE_CONTROL_RESOURCE_NOT_FOUND',
            'The requested repository or reference does not exist on GitHub, or is not accessible to the GitHub App installation.',
            options,
        );
    }
}

/**
 * Raised when source control is unreachable or answers with a failure of its own.
 */
export class SourceControlUnavailableError extends DomainError {
    constructor(options?: ErrorOptions) {
        super(
            'SOURCE_CONTROL_UNAVAILABLE',
            'GitHub is unreachable. Try again later.',
            options,
        );
    }
}
