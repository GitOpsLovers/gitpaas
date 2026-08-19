import { DomainError } from '@core/domain/errors/domain.error';

/**
 * Raised when the record of a provider holds no usable credentials.
 */
export class ProviderNotConfiguredError extends DomainError {
    constructor(providerId: string, options?: ErrorOptions) {
        super(
            'PROVIDER_NOT_CONFIGURED',
            `Provider ${providerId} holds no usable credentials. Check its application id, installation id and private key.`,
            options,
        );
    }
}

/**
 * Raised when the provider rejects our credentials.
 */
export class ProviderAuthenticationError extends DomainError {
    constructor(options?: ErrorOptions) {
        super(
            'PROVIDER_AUTHENTICATION_FAILED',
            'The GitHub App could not authenticate with GitHub. Check the installation credentials.',
            options,
        );
    }
}

/**
 * Raised when the provider refuses the request because the installation's API quota is exhausted.
 */
export class ProviderRateLimitedError extends DomainError {
    constructor(options?: ErrorOptions) {
        super(
            'PROVIDER_RATE_LIMITED',
            'GitHub rate limit exhausted for this installation. Try again later.',
            options,
        );
    }
}

/**
 * Raised when the repository, branch or commit asked for does not exist on the provider, or is not visible to the installation.
 */
export class ProviderResourceNotFoundError extends DomainError {
    constructor(options?: ErrorOptions) {
        super(
            'PROVIDER_RESOURCE_NOT_FOUND',
            'The requested repository or reference does not exist on GitHub, or is not accessible to the GitHub App installation.',
            options,
        );
    }
}

/**
 * Raised when the provider is unreachable or answers with a failure of its own.
 */
export class ProviderUnavailableError extends DomainError {
    constructor(options?: ErrorOptions) {
        super(
            'PROVIDER_UNAVAILABLE',
            'GitHub is unreachable. Try again later.',
            options,
        );
    }
}

/**
 * Raised when GitHub refuses the temporary code of a manifest, because it is already used or too old.
 */
export class ProviderManifestCodeRejectedError extends DomainError {
    constructor(options?: ErrorOptions) {
        super(
            'PROVIDER_MANIFEST_CODE_REJECTED',
            'GitHub refused the temporary code of the manifest. A code serves one time only, and it dies after one hour. Start the registration again.',
            options,
        );
    }
}
