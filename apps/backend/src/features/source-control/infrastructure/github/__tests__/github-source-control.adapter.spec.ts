import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/rest';

import {
    SourceControlNotConfiguredError,
    SourceControlRateLimitedError,
    SourceControlResourceNotFoundError,
    SourceControlUnavailableError,
} from '../../../domain/errors/source-control.errors';
import { ProviderCredentials } from '../../../domain/models/provider.models';
import { GithubSourceControlAdapter } from '../github-source-control.adapter';

const OctokitMock = Octokit as unknown as jest.Mock;

/**
 * Documented fake for the Octokit client the SUT talks to. Octokit's `paginate`
 * / `request` are heavily overloaded, so a `jest.Mocked<Pick<Octokit, …>>` is
 * impractical here — this narrow interface of `jest.Mock`s is the fallback.
 */
interface FakeClient {
    paginate: jest.Mock;
    request: jest.Mock;
}

/** Build the credentials of a provider, overriding whatever the case needs. */
const createCredentials = (overrides: Partial<ProviderCredentials> = {}): ProviderCredentials => ({
    providerId: 'provider-1',
    appId: '123',
    installationId: '456',
    privateKey: 'PEMKEY',
    ...overrides,
});

describe('GithubSourceControlAdapter', () => {
    const credentials = createCredentials();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // --- Layer A: API method mapping (Octokit isolated via a spied `getClient`) ---
    describe('API method mapping', () => {
        let sut: GithubSourceControlAdapter;
        let mockClient: FakeClient;

        beforeEach(() => {
            sut = new GithubSourceControlAdapter();
            mockClient = { paginate: jest.fn(), request: jest.fn() };

            // `getClient()` is private, so cast through `unknown` to spy on it and hand
            // back the fake client. This isolates the mapping logic from Octokit entirely.
            jest.spyOn(sut as unknown as { getClient: () => unknown }, 'getClient').mockReturnValue(mockClient);
        });

        it('maps installation repositories to the domain shape', async () => {
            mockClient.paginate.mockResolvedValue([
                {
                    id: 1, full_name: 'o/r', default_branch: 'main', private: true,
                },
                {
                    id: 2, full_name: 'o/r2', default_branch: 'dev', private: false,
                },
            ]);

            const result = await sut.listRepositories(credentials);

            expect(mockClient.paginate).toHaveBeenCalledWith('GET /installation/repositories');
            expect(result).toEqual([
                {
                    id: 1, fullName: 'o/r', defaultBranch: 'main', private: true,
                },
                {
                    id: 2, fullName: 'o/r2', defaultBranch: 'dev', private: false,
                },
            ]);
        });

        it('answers with an empty list when the installation reaches no repository', async () => {
            mockClient.paginate.mockResolvedValue([]);

            await expect(sut.listRepositories(credentials)).resolves.toEqual([]);
        });

        it('resolves the repository full name and maps its branches', async () => {
            mockClient.request.mockResolvedValue({ data: { full_name: 'octo/hello' } });
            mockClient.paginate.mockResolvedValue([{ name: 'main' }, { name: 'dev' }]);

            const result = await sut.listBranches(credentials, 42);

            expect(mockClient.request).toHaveBeenCalledWith('GET /repositories/{id}', { id: 42 });
            expect(mockClient.paginate).toHaveBeenCalledWith('GET /repos/{owner}/{repo}/branches', {
                owner: 'octo',
                repo: 'hello',
            });
            expect(result).toEqual([{ name: 'main' }, { name: 'dev' }]);
        });

        it('resolves a ref to its head commit', async () => {
            mockClient.request
                .mockResolvedValueOnce({ data: { full_name: 'octo/hello' } })
                .mockResolvedValueOnce({ data: { sha: 'abc123', commit: { message: 'Fix thing\n\nbody' } } });

            const result = await sut.getCommit(credentials, 42, 'main');

            expect(mockClient.request).toHaveBeenNthCalledWith(1, 'GET /repositories/{id}', { id: 42 });
            expect(mockClient.request).toHaveBeenNthCalledWith(2, 'GET /repos/{owner}/{repo}/commits/{ref}', {
                owner: 'octo',
                repo: 'hello',
                ref: 'main',
            });
            expect(result).toEqual({ sha: 'abc123', message: 'Fix thing\n\nbody' });
        });

        it('returns the repository archive bytes as a Buffer', async () => {
            const bytes = new TextEncoder().encode('tar-bytes').buffer;
            mockClient.request
                .mockResolvedValueOnce({ data: { full_name: 'octo/hello' } })
                .mockResolvedValueOnce({ data: bytes });

            const result = await sut.getRepositoryArchive(credentials, 42, 'main');

            expect(mockClient.request).toHaveBeenNthCalledWith(2, 'GET /repos/{owner}/{repo}/tarball/{ref}', {
                owner: 'octo',
                repo: 'hello',
                ref: 'main',
            });
            expect(Buffer.isBuffer(result)).toBe(true);
            expect(result.toString()).toBe('tar-bytes');
        });
    });

    // --- Layer A'': verification of the credentials ---
    describe('verifyCredentials', () => {
        let sut: GithubSourceControlAdapter;
        let mockClient: FakeClient;

        beforeEach(() => {
            sut = new GithubSourceControlAdapter();
            mockClient = { paginate: jest.fn(), request: jest.fn() };

            jest.spyOn(sut as unknown as { getClient: () => unknown }, 'getClient').mockReturnValue(mockClient);
        });

        it('asks GitHub for the application and answers true when it answers', async () => {
            mockClient.request.mockResolvedValue({ data: { id: 123 } });

            await expect(sut.verifyCredentials(credentials)).resolves.toBe(true);
            expect(mockClient.request).toHaveBeenCalledWith('GET /app');
        });

        it('answers false when GitHub rejects the credentials', async () => {
            mockClient.request.mockRejectedValue(
                Object.assign(new Error('bad credentials'), { status: 401, response: { headers: {} } }),
            );

            await expect(sut.verifyCredentials(credentials)).resolves.toBe(false);
        });

        it('answers false when the record holds no usable credentials', async () => {
            const bare = new GithubSourceControlAdapter();

            await expect(bare.verifyCredentials(createCredentials({ privateKey: '' }))).resolves.toBe(false);
            expect(OctokitMock).not.toHaveBeenCalled();
        });

        it('lets a failure that is no authentication failure escape', async () => {
            mockClient.request.mockRejectedValue(
                Object.assign(new Error('boom'), { status: 503, response: { headers: {} } }),
            );

            await expect(sut.verifyCredentials(credentials)).rejects.toBeInstanceOf(SourceControlUnavailableError);
        });
    });

    // --- Layer A': failure translation (Octokit isolated via a spied `getClient`) ---
    describe('failure translation', () => {
        let sut: GithubSourceControlAdapter;
        let mockClient: FakeClient;

        /** Stand-in for an Octokit `RequestError` carrying an HTTP status. */
        const requestError = (status: number): Error =>
            Object.assign(new Error('secret octokit detail'), { status, response: { headers: {} } });

        beforeEach(() => {
            sut = new GithubSourceControlAdapter();
            mockClient = { paginate: jest.fn(), request: jest.fn() };

            jest.spyOn(sut as unknown as { getClient: () => unknown }, 'getClient').mockReturnValue(mockClient);
        });

        it('translates a GitHub outage raised by listRepositories', async () => {
            mockClient.paginate.mockRejectedValue(requestError(503));

            await expect(sut.listRepositories(credentials)).rejects.toBeInstanceOf(SourceControlUnavailableError);
        });

        it('translates an exhausted rate limit raised by listRepositories', async () => {
            mockClient.paginate.mockRejectedValue(requestError(429));

            await expect(sut.listRepositories(credentials)).rejects.toBeInstanceOf(SourceControlRateLimitedError);
        });

        it('translates a missing repository raised by listBranches', async () => {
            mockClient.request.mockRejectedValue(requestError(404));

            await expect(sut.listBranches(credentials, 42)).rejects.toBeInstanceOf(SourceControlResourceNotFoundError);
        });

        it('translates a missing ref raised by getCommit', async () => {
            mockClient.request
                .mockResolvedValueOnce({ data: { full_name: 'octo/hello' } })
                .mockRejectedValueOnce(requestError(404));

            await expect(sut.getCommit(credentials, 42, 'nope'))
                .rejects.toBeInstanceOf(SourceControlResourceNotFoundError);
        });

        it('translates a failure raised by getRepositoryArchive', async () => {
            mockClient.request
                .mockResolvedValueOnce({ data: { full_name: 'octo/hello' } })
                .mockRejectedValueOnce(requestError(500));

            await expect(sut.getRepositoryArchive(credentials, 42, 'main'))
                .rejects.toBeInstanceOf(SourceControlUnavailableError);
        });

        it('never lets the Octokit message escape', async () => {
            mockClient.paginate.mockRejectedValue(requestError(503));

            await expect(sut.listRepositories(credentials)).rejects.not.toThrow('secret octokit detail');
        });

        it('chains the original Octokit failure as the cause', async () => {
            const original = requestError(404);
            mockClient.request.mockRejectedValue(original);

            await expect(sut.listBranches(credentials, 42)).rejects.toMatchObject({ cause: original });
        });

        it('leaves an unclassifiable failure untouched, so the filter answers 500', async () => {
            const original = requestError(422);
            mockClient.paginate.mockRejectedValue(original);

            await expect(sut.listRepositories(credentials)).rejects.toBe(original);
        });
    });

    // --- Layer B: createClient / credentials wiring (real createClient, mocked Octokit) ---
    describe('client creation', () => {
        it('throws SourceControlNotConfiguredError and never builds a client when a credential is missing', async () => {
            const sut = new GithubSourceControlAdapter();

            await expect(sut.listRepositories(createCredentials({ privateKey: '' })))
                .rejects.toThrow(SourceControlNotConfiguredError);
            expect(OctokitMock).not.toHaveBeenCalled();
        });

        it('names the provider in the message, so the operator can correct that record', async () => {
            const sut = new GithubSourceControlAdapter();

            await expect(sut.listRepositories(createCredentials({ providerId: 'acme-provider', appId: '' })))
                .rejects.toThrow(/acme-provider/);
        });

        it('constructs Octokit with the credentials of the provider and the app-auth strategy', async () => {
            const sut = new GithubSourceControlAdapter();

            await sut.listRepositories(credentials);

            expect(OctokitMock).toHaveBeenCalledTimes(1);
            expect(OctokitMock).toHaveBeenCalledWith({
                authStrategy: createAppAuth,
                auth: {
                    appId: '123',
                    privateKey: 'PEMKEY',
                    installationId: 456,
                },
            });
        });

        it('builds one client for each provider, authenticated as two different applications', async () => {
            const sut = new GithubSourceControlAdapter();

            await sut.listRepositories(createCredentials({ providerId: 'provider-a', appId: '111' }));
            await sut.listRepositories(createCredentials({ providerId: 'provider-b', appId: '222' }));

            expect(OctokitMock).toHaveBeenCalledTimes(2);
            expect(OctokitMock.mock.calls[0][0].auth.appId).toBe('111');
            expect(OctokitMock.mock.calls[1][0].auth.appId).toBe('222');
            expect(OctokitMock.mock.results[0].value).not.toBe(OctokitMock.mock.results[1].value);
        });

        it('builds the client of one provider once, and reuses it on the second call', async () => {
            const sut = new GithubSourceControlAdapter();
            const getClient = sut as unknown as { getClient: (given: ProviderCredentials) => unknown };

            await sut.listRepositories(credentials);
            await sut.listRepositories(credentials);

            expect(OctokitMock).toHaveBeenCalledTimes(1);
            expect(getClient.getClient(credentials)).toBe(OctokitMock.mock.results[0].value);
        });
    });
});
