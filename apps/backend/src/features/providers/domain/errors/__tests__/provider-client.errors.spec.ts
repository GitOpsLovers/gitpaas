import {
    ProviderAuthenticationError,
    ProviderManifestCodeRejectedError,
    ProviderNotConfiguredError,
    ProviderRateLimitedError,
    ProviderResourceNotFoundError,
    ProviderUnavailableError,
} from '../provider-client.errors';

import { DomainError } from '@core/domain/errors/domain.error';

describe('ProviderNotConfiguredError', () => {
    const providerId = 'a3f1b2c4-0000-4000-8000-000000000001';

    it('is a DomainError', () => {
        expect(new ProviderNotConfiguredError(providerId)).toBeInstanceOf(DomainError);
    });

    it('sets its name to ProviderNotConfiguredError', () => {
        expect(new ProviderNotConfiguredError(providerId).name).toBe('ProviderNotConfiguredError');
    });

    it('carries the PROVIDER_NOT_CONFIGURED code', () => {
        expect(new ProviderNotConfiguredError(providerId).code).toBe('PROVIDER_NOT_CONFIGURED');
    });

    it('names the provider the operator must correct', () => {
        expect(new ProviderNotConfiguredError(providerId).message).toContain(providerId);
    });

    it('chains the original error through the cause option', () => {
        const original = new Error('credentials read failed');

        expect(new ProviderNotConfiguredError(providerId, { cause: original }).cause).toBe(original);
    });
});

describe('ProviderAuthenticationError', () => {
    it('is a DomainError', () => {
        expect(new ProviderAuthenticationError()).toBeInstanceOf(DomainError);
    });

    it('sets its name to ProviderAuthenticationError', () => {
        expect(new ProviderAuthenticationError().name).toBe('ProviderAuthenticationError');
    });

    it('carries the PROVIDER_AUTHENTICATION_FAILED code', () => {
        expect(new ProviderAuthenticationError().code).toBe('PROVIDER_AUTHENTICATION_FAILED');
    });

    it('blames our own installation credentials, not the caller', () => {
        expect(new ProviderAuthenticationError().message)
            .toBe('The GitHub App could not authenticate with GitHub. Check the installation credentials.');
    });

    it('chains the original error through the cause option', () => {
        const original = new Error('401');

        expect(new ProviderAuthenticationError({ cause: original }).cause).toBe(original);
    });
});

describe('ProviderRateLimitedError', () => {
    it('is a DomainError', () => {
        expect(new ProviderRateLimitedError()).toBeInstanceOf(DomainError);
    });

    it('sets its name to ProviderRateLimitedError', () => {
        expect(new ProviderRateLimitedError().name).toBe('ProviderRateLimitedError');
    });

    it('carries the PROVIDER_RATE_LIMITED code', () => {
        expect(new ProviderRateLimitedError().code).toBe('PROVIDER_RATE_LIMITED');
    });

    it('invites the caller to retry later', () => {
        expect(new ProviderRateLimitedError().message)
            .toBe('GitHub rate limit exhausted for this installation. Try again later.');
    });

    it('chains the original error through the cause option', () => {
        const original = new Error('403');

        expect(new ProviderRateLimitedError({ cause: original }).cause).toBe(original);
    });
});

describe('ProviderResourceNotFoundError', () => {
    it('is a DomainError', () => {
        expect(new ProviderResourceNotFoundError()).toBeInstanceOf(DomainError);
    });

    it('sets its name to ProviderResourceNotFoundError', () => {
        expect(new ProviderResourceNotFoundError().name).toBe('ProviderResourceNotFoundError');
    });

    it('carries the PROVIDER_RESOURCE_NOT_FOUND code', () => {
        expect(new ProviderResourceNotFoundError().code).toBe('PROVIDER_RESOURCE_NOT_FOUND');
    });

    it('explains that the repository or reference is missing', () => {
        expect(new ProviderResourceNotFoundError().message).toContain('does not exist on GitHub');
    });

    it('chains the original error through the cause option', () => {
        const original = new Error('404');

        expect(new ProviderResourceNotFoundError({ cause: original }).cause).toBe(original);
    });
});

describe('ProviderUnavailableError', () => {
    it('is a DomainError', () => {
        expect(new ProviderUnavailableError()).toBeInstanceOf(DomainError);
    });

    it('sets its name to ProviderUnavailableError', () => {
        expect(new ProviderUnavailableError().name).toBe('ProviderUnavailableError');
    });

    it('carries the PROVIDER_UNAVAILABLE code', () => {
        expect(new ProviderUnavailableError().code).toBe('PROVIDER_UNAVAILABLE');
    });

    it('invites the caller to retry later', () => {
        expect(new ProviderUnavailableError().message).toBe('GitHub is unreachable. Try again later.');
    });

    it('chains the original error through the cause option', () => {
        const original = new Error('ECONNREFUSED');

        expect(new ProviderUnavailableError({ cause: original }).cause).toBe(original);
    });
});

describe('ProviderManifestCodeRejectedError', () => {
    it('is a DomainError', () => {
        expect(new ProviderManifestCodeRejectedError()).toBeInstanceOf(DomainError);
    });

    it('sets its name to ProviderManifestCodeRejectedError', () => {
        expect(new ProviderManifestCodeRejectedError().name).toBe('ProviderManifestCodeRejectedError');
    });

    it('carries the PROVIDER_MANIFEST_CODE_REJECTED code', () => {
        expect(new ProviderManifestCodeRejectedError().code).toBe('PROVIDER_MANIFEST_CODE_REJECTED');
    });

    it('states that the code serves one time and dies after one hour', () => {
        expect(new ProviderManifestCodeRejectedError().message)
            .toBe('GitHub refused the temporary code of the manifest. A code serves one time only, and it dies after one hour. Start the registration again.');
    });

    it('chains the original error through the cause option', () => {
        const original = new Error('404');

        expect(new ProviderManifestCodeRejectedError({ cause: original }).cause).toBe(original);
    });
});
