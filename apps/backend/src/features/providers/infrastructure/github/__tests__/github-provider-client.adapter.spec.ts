import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/rest';

import {
    ProviderManifestCodeRejectedError,
    ProviderNotConfiguredError,
    ProviderRateLimitedError,
    ProviderResourceNotFoundError,
    ProviderUnavailableError,
} from '../../../domain/errors/provider-client.errors';
import { ProviderCredentials } from '../../../domain/models/provider.models';
import { GithubProviderClientAdapter } from '../github-provider-client.adapter';

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

describe('GithubProviderClientAdapter', () => {
    const credentials = createCredentials();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // --- Layer A: API method mapping (Octokit isolated via a spied `getClient`) ---
    describe('API method mapping', () => {
        let sut: GithubProviderClientAdapter;
        let mockClient: FakeClient;

        beforeEach(() => {
            sut = new GithubProviderClientAdapter();
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
        let sut: GithubProviderClientAdapter;
        let mockClient: FakeClient;

        beforeEach(() => {
            sut = new GithubProviderClientAdapter();
            mockClient = { paginate: jest.fn(), request: jest.fn() };

            jest.spyOn(sut as unknown as { getClient: () => unknown }, 'getClient').mockReturnValue(mockClient);
        });

        it('asks GitHub for the application and gives the permissions it carries', async () => {
            mockClient.request.mockResolvedValue({
                data: { id: 123, permissions: { contents: 'read', metadata: 'read' } },
            });

            await expect(sut.verifyCredentials(credentials)).resolves.toEqual({
                accepted: true,
                permissions: { contents: 'read', metadata: 'read' },
            });
            expect(mockClient.request).toHaveBeenCalledWith('GET /app');
        });

        it('gives no permission when GitHub names none for the application', async () => {
            mockClient.request.mockResolvedValue({ data: { id: 123 } });

            await expect(sut.verifyCredentials(credentials)).resolves.toEqual({
                accepted: true,
                permissions: {},
            });
        });

        it('answers accepted false with no permission when GitHub rejects the credentials', async () => {
            mockClient.request.mockRejectedValue(
                Object.assign(new Error('bad credentials'), { status: 401, response: { headers: {} } }),
            );

            await expect(sut.verifyCredentials(credentials)).resolves.toEqual({
                accepted: false,
                permissions: {},
            });
        });

        it('answers accepted false when the record holds no usable credentials', async () => {
            const bare = new GithubProviderClientAdapter();

            await expect(bare.verifyCredentials(createCredentials({ privateKey: '' }))).resolves.toEqual({
                accepted: false,
                permissions: {},
            });
            expect(OctokitMock).not.toHaveBeenCalled();
        });

        it('reports no missing permission of its own', async () => {
            mockClient.request.mockResolvedValue({ data: { id: 123, permissions: {} } });

            const result = await sut.verifyCredentials(credentials);

            expect(result).not.toHaveProperty('missingPermissions');
            expect(result).not.toHaveProperty('outcome');
        });

        it('lets a failure that is no authentication failure escape', async () => {
            mockClient.request.mockRejectedValue(
                Object.assign(new Error('boom'), { status: 503, response: { headers: {} } }),
            );

            await expect(sut.verifyCredentials(credentials)).rejects.toBeInstanceOf(ProviderUnavailableError);
        });
    });

    // --- Layer A': failure translation (Octokit isolated via a spied `getClient`) ---
    describe('failure translation', () => {
        let sut: GithubProviderClientAdapter;
        let mockClient: FakeClient;

        /** Stand-in for an Octokit `RequestError` carrying an HTTP status. */
        const requestError = (status: number): Error =>
            Object.assign(new Error('secret octokit detail'), { status, response: { headers: {} } });

        beforeEach(() => {
            sut = new GithubProviderClientAdapter();
            mockClient = { paginate: jest.fn(), request: jest.fn() };

            jest.spyOn(sut as unknown as { getClient: () => unknown }, 'getClient').mockReturnValue(mockClient);
        });

        it('translates a GitHub outage raised by listRepositories', async () => {
            mockClient.paginate.mockRejectedValue(requestError(503));

            await expect(sut.listRepositories(credentials)).rejects.toBeInstanceOf(ProviderUnavailableError);
        });

        it('translates an exhausted rate limit raised by listRepositories', async () => {
            mockClient.paginate.mockRejectedValue(requestError(429));

            await expect(sut.listRepositories(credentials)).rejects.toBeInstanceOf(ProviderRateLimitedError);
        });

        it('translates a missing repository raised by listBranches', async () => {
            mockClient.request.mockRejectedValue(requestError(404));

            await expect(sut.listBranches(credentials, 42)).rejects.toBeInstanceOf(ProviderResourceNotFoundError);
        });

        it('translates a missing ref raised by getCommit', async () => {
            mockClient.request
                .mockResolvedValueOnce({ data: { full_name: 'octo/hello' } })
                .mockRejectedValueOnce(requestError(404));

            await expect(sut.getCommit(credentials, 42, 'nope'))
                .rejects.toBeInstanceOf(ProviderResourceNotFoundError);
        });

        it('translates a failure raised by getRepositoryArchive', async () => {
            mockClient.request
                .mockResolvedValueOnce({ data: { full_name: 'octo/hello' } })
                .mockRejectedValueOnce(requestError(500));

            await expect(sut.getRepositoryArchive(credentials, 42, 'main'))
                .rejects.toBeInstanceOf(ProviderUnavailableError);
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
        it('throws ProviderNotConfiguredError and never builds a client when a credential is missing', async () => {
            const sut = new GithubProviderClientAdapter();

            await expect(sut.listRepositories(createCredentials({ privateKey: '' })))
                .rejects.toThrow(ProviderNotConfiguredError);
            expect(OctokitMock).not.toHaveBeenCalled();
        });

        it('names the provider in the message, so the operator can correct that record', async () => {
            const sut = new GithubProviderClientAdapter();

            await expect(sut.listRepositories(createCredentials({ providerId: 'acme-provider', appId: '' })))
                .rejects.toThrow(/acme-provider/);
        });

        it('constructs Octokit with the credentials of the provider and the app-auth strategy', async () => {
            const sut = new GithubProviderClientAdapter();

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
            const sut = new GithubProviderClientAdapter();

            await sut.listRepositories(createCredentials({ providerId: 'provider-a', appId: '111' }));
            await sut.listRepositories(createCredentials({ providerId: 'provider-b', appId: '222' }));

            expect(OctokitMock).toHaveBeenCalledTimes(2);
            expect(OctokitMock.mock.calls[0][0].auth.appId).toBe('111');
            expect(OctokitMock.mock.calls[1][0].auth.appId).toBe('222');
            expect(OctokitMock.mock.results[0].value).not.toBe(OctokitMock.mock.results[1].value);
        });

        it('builds the client of one provider once, and reuses it on the second call', async () => {
            const sut = new GithubProviderClientAdapter();
            const getClient = sut as unknown as { getClient: (given: ProviderCredentials) => unknown };

            await sut.listRepositories(credentials);
            await sut.listRepositories(credentials);

            expect(OctokitMock).toHaveBeenCalledTimes(1);
            expect(getClient.getClient(credentials)).toBe(OctokitMock.mock.results[0].value);
        });
    });

    // --- Layer C: the conversion of a manifest (anonymous client isolated via a spied getter) ---
    describe('conversion of a manifest', () => {
        let sut: GithubProviderClientAdapter;
        let mockClient: FakeClient;

        /** Stand-in for an Octokit `RequestError` carrying an HTTP status. */
        const requestError = (status: number): Error =>
            Object.assign(new Error('secret octokit detail'), { status, response: { headers: {} } });

        beforeEach(() => {
            sut = new GithubProviderClientAdapter();
            mockClient = { paginate: jest.fn(), request: jest.fn() };

            // `getAnonymousClient()` is private, so cast through `unknown` to spy on it.
            jest.spyOn(
                sut as unknown as { getAnonymousClient: () => unknown },
                'getAnonymousClient',
            ).mockReturnValue(mockClient);
        });

        it('converts the code and maps the configuration of the application', async () => {
            mockClient.request.mockResolvedValue({
                data: {
                    id: 987, slug: 'gitpaas-acme', pem: 'PEMKEY', client_secret: 'shh', webhook_secret: 'shh',
                },
            });

            const result = await sut.convertAppManifest('temporary-code');

            expect(mockClient.request).toHaveBeenCalledWith('POST /app-manifests/{code}/conversions', {
                code: 'temporary-code',
            });
            expect(result).toEqual({ appId: '987', appSlug: 'gitpaas-acme', privateKey: 'PEMKEY' });
        });

        it('gives back no secret of the application beyond the private key', async () => {
            mockClient.request.mockResolvedValue({
                data: {
                    id: 987, slug: 'gitpaas-acme', pem: 'PEMKEY', client_secret: 'shh', webhook_secret: 'shh',
                },
            });

            const result = await sut.convertAppManifest('temporary-code');

            expect(Object.keys(result)).toEqual(['appId', 'appSlug', 'privateKey']);
        });

        it('takes no credentials of a provider, so it builds no authenticated client', async () => {
            mockClient.request.mockResolvedValue({ data: { id: 1, slug: 'app', pem: 'PEMKEY' } });

            await sut.convertAppManifest('temporary-code');

            expect(OctokitMock).not.toHaveBeenCalled();
        });

        it('reads a code that is already used as a refusal of the code', async () => {
            mockClient.request.mockRejectedValue(requestError(404));

            await expect(sut.convertAppManifest('used-code'))
                .rejects.toBeInstanceOf(ProviderManifestCodeRejectedError);
        });

        it('reads a code that is too old as a refusal of the code', async () => {
            mockClient.request.mockRejectedValue(requestError(422));

            await expect(sut.convertAppManifest('stale-code'))
                .rejects.toBeInstanceOf(ProviderManifestCodeRejectedError);
        });

        it('never lets the Octokit message escape the refusal of a code', async () => {
            mockClient.request.mockRejectedValue(requestError(404));

            await expect(sut.convertAppManifest('used-code')).rejects.not.toThrow('secret octokit detail');
        });

        it('translates an outage of GitHub with the translator of the adapter', async () => {
            mockClient.request.mockRejectedValue(requestError(503));

            await expect(sut.convertAppManifest('temporary-code'))
                .rejects.toBeInstanceOf(ProviderUnavailableError);
        });

        it('translates an exhausted rate limit with the translator of the adapter', async () => {
            mockClient.request.mockRejectedValue(requestError(429));

            await expect(sut.convertAppManifest('temporary-code'))
                .rejects.toBeInstanceOf(ProviderRateLimitedError);
        });

        // eslint-disable-next-line @typescript-eslint/require-await
        it('builds the anonymous client with no authentication, once for every conversion', async () => {
            const bare = new GithubProviderClientAdapter();
            const anonymous = bare as unknown as { getAnonymousClient: () => unknown };

            expect(anonymous.getAnonymousClient()).toBe(anonymous.getAnonymousClient());
            expect(OctokitMock).toHaveBeenCalledTimes(1);
            expect(OctokitMock).toHaveBeenCalledWith();
        });
    });
});
