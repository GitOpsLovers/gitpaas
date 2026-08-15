import {
    SourceControlAuthenticationError,
    SourceControlNotConfiguredError,
    SourceControlRateLimitedError,
    SourceControlResourceNotFoundError,
    SourceControlUnavailableError,
} from '../source-control.errors';

import { DomainError } from '@core/domain/errors/domain.error';

describe('SourceControlNotConfiguredError', () => {
    const providerId = 'a3f1b2c4-0000-4000-8000-000000000001';

    it('is a DomainError', () => {
        expect(new SourceControlNotConfiguredError(providerId)).toBeInstanceOf(DomainError);
    });

    it('sets its name to SourceControlNotConfiguredError', () => {
        expect(new SourceControlNotConfiguredError(providerId).name).toBe('SourceControlNotConfiguredError');
    });

    it('carries the SOURCE_CONTROL_NOT_CONFIGURED code', () => {
        expect(new SourceControlNotConfiguredError(providerId).code).toBe('SOURCE_CONTROL_NOT_CONFIGURED');
    });

    it('names the provider the operator must correct', () => {
        expect(new SourceControlNotConfiguredError(providerId).message).toContain(providerId);
    });

    it('chains the original error through the cause option', () => {
        const original = new Error('credentials read failed');

        expect(new SourceControlNotConfiguredError(providerId, { cause: original }).cause).toBe(original);
    });
});

describe('SourceControlAuthenticationError', () => {
    it('is a DomainError', () => {
        expect(new SourceControlAuthenticationError()).toBeInstanceOf(DomainError);
    });

    it('sets its name to SourceControlAuthenticationError', () => {
        expect(new SourceControlAuthenticationError().name).toBe('SourceControlAuthenticationError');
    });

    it('carries the SOURCE_CONTROL_AUTHENTICATION_FAILED code', () => {
        expect(new SourceControlAuthenticationError().code).toBe('SOURCE_CONTROL_AUTHENTICATION_FAILED');
    });

    it('blames our own installation credentials, not the caller', () => {
        expect(new SourceControlAuthenticationError().message)
            .toBe('The GitHub App could not authenticate with GitHub. Check the installation credentials.');
    });

    it('chains the original error through the cause option', () => {
        const original = new Error('401');

        expect(new SourceControlAuthenticationError({ cause: original }).cause).toBe(original);
    });
});

describe('SourceControlRateLimitedError', () => {
    it('is a DomainError', () => {
        expect(new SourceControlRateLimitedError()).toBeInstanceOf(DomainError);
    });

    it('sets its name to SourceControlRateLimitedError', () => {
        expect(new SourceControlRateLimitedError().name).toBe('SourceControlRateLimitedError');
    });

    it('carries the SOURCE_CONTROL_RATE_LIMITED code', () => {
        expect(new SourceControlRateLimitedError().code).toBe('SOURCE_CONTROL_RATE_LIMITED');
    });

    it('invites the caller to retry later', () => {
        expect(new SourceControlRateLimitedError().message)
            .toBe('GitHub rate limit exhausted for this installation. Try again later.');
    });

    it('chains the original error through the cause option', () => {
        const original = new Error('403');

        expect(new SourceControlRateLimitedError({ cause: original }).cause).toBe(original);
    });
});

describe('SourceControlResourceNotFoundError', () => {
    it('is a DomainError', () => {
        expect(new SourceControlResourceNotFoundError()).toBeInstanceOf(DomainError);
    });

    it('sets its name to SourceControlResourceNotFoundError', () => {
        expect(new SourceControlResourceNotFoundError().name).toBe('SourceControlResourceNotFoundError');
    });

    it('carries the SOURCE_CONTROL_RESOURCE_NOT_FOUND code', () => {
        expect(new SourceControlResourceNotFoundError().code).toBe('SOURCE_CONTROL_RESOURCE_NOT_FOUND');
    });

    it('explains that the repository or reference is missing', () => {
        expect(new SourceControlResourceNotFoundError().message).toContain('does not exist on GitHub');
    });

    it('chains the original error through the cause option', () => {
        const original = new Error('404');

        expect(new SourceControlResourceNotFoundError({ cause: original }).cause).toBe(original);
    });
});

describe('SourceControlUnavailableError', () => {
    it('is a DomainError', () => {
        expect(new SourceControlUnavailableError()).toBeInstanceOf(DomainError);
    });

    it('sets its name to SourceControlUnavailableError', () => {
        expect(new SourceControlUnavailableError().name).toBe('SourceControlUnavailableError');
    });

    it('carries the SOURCE_CONTROL_UNAVAILABLE code', () => {
        expect(new SourceControlUnavailableError().code).toBe('SOURCE_CONTROL_UNAVAILABLE');
    });

    it('invites the caller to retry later', () => {
        expect(new SourceControlUnavailableError().message).toBe('GitHub is unreachable. Try again later.');
    });

    it('chains the original error through the cause option', () => {
        const original = new Error('ECONNREFUSED');

        expect(new SourceControlUnavailableError({ cause: original }).cause).toBe(original);
    });
});
