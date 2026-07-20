import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/rest';

import { GithubAppProvider } from '../github-app.provider';

import { DiagnosticLoggerService } from '@core/ui/services/diagnostic-logger.service';

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

/** Build a stub `ConfigService` whose `get` returns the provided values. */
const createConfig = (values: Record<string, string | undefined> = {}): ConfigService =>
    ({ get: jest.fn((key: string) => values[key]) }) as unknown as ConfigService;

/** Build a no-op diagnostic logger stub. */
const createDiagnostics = (): DiagnosticLoggerService =>
    ({ log: jest.fn(), warn: jest.fn(), error: jest.fn() }) as unknown as DiagnosticLoggerService;

describe('GithubAppProvider', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // --- Layer A: API method mapping (Octokit isolated via a spied `getClient`) ---
    describe('API method mapping', () => {
        let sut: GithubAppProvider;
        let mockClient: FakeClient;

        beforeEach(() => {
            sut = new GithubAppProvider(createConfig(), createDiagnostics());
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

            const result = await sut.listRepositories();

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

        it('resolves the repository full name and maps its branches', async () => {
            mockClient.request.mockResolvedValue({ data: { full_name: 'octo/hello' } });
            mockClient.paginate.mockResolvedValue([{ name: 'main' }, { name: 'dev' }]);

            const result = await sut.listBranches(42);

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

            const result = await sut.getCommit(42, 'main');

            expect(mockClient.request).toHaveBeenNthCalledWith(1, 'GET /repositories/{id}', { id: 42 });
            expect(mockClient.request).toHaveBeenNthCalledWith(2, 'GET /repos/{owner}/{repo}/commits/{ref}', {
                owner: 'octo',
                repo: 'hello',
                ref: 'main',
            });
            expect(result).toEqual({ sha: 'abc123', message: 'Fix thing\n\nbody' });
        });

        it('reads and decodes a file content', async () => {
            mockClient.request
                .mockResolvedValueOnce({ data: { full_name: 'octo/hello' } })
                .mockResolvedValueOnce({
                    data: { type: 'file', content: Buffer.from('hello world').toString('base64') },
                });

            const result = await sut.getFileContent(42, 'src/index.ts', 'main');

            expect(mockClient.request).toHaveBeenNthCalledWith(2, 'GET /repos/{owner}/{repo}/contents/{+path}', {
                owner: 'octo',
                repo: 'hello',
                path: 'src/index.ts',
                ref: 'main',
            });
            expect(result).toBe('hello world');
        });

        it.each([
            ['the path resolves to a directory listing (array)', [{ name: 'a' }, { name: 'b' }]],
            ['the entry is not a file', { type: 'dir' }],
            ['the content is not a string', { type: 'file', content: undefined }],
        ])('throws NotFoundException when %s', async (_case, data) => {
            mockClient.request
                .mockResolvedValueOnce({ data: { full_name: 'octo/hello' } })
                .mockResolvedValueOnce({ data });

            await expect(sut.getFileContent(42, 'some/path', 'main')).rejects.toThrow(NotFoundException);
        });

        it('returns the repository archive bytes as a Buffer', async () => {
            const bytes = new TextEncoder().encode('tar-bytes').buffer;
            mockClient.request
                .mockResolvedValueOnce({ data: { full_name: 'octo/hello' } })
                .mockResolvedValueOnce({ data: bytes });

            const result = await sut.getRepositoryArchive(42, 'main');

            expect(mockClient.request).toHaveBeenNthCalledWith(2, 'GET /repos/{owner}/{repo}/tarball/{ref}', {
                owner: 'octo',
                repo: 'hello',
                ref: 'main',
            });
            expect(Buffer.isBuffer(result)).toBe(true);
            expect(result.toString()).toBe('tar-bytes');
        });
    });

    // --- Layer B: createClient / config wiring (real createClient, mocked Octokit) ---
    describe('client creation', () => {
        it('throws ServiceUnavailableException and never builds a client when config is missing', async () => {
            const sut = new GithubAppProvider(
                createConfig({
                    GITHUB_APP_ID: '123',
                    GITHUB_APP_PRIVATE_KEY: undefined,
                    GITHUB_APP_INSTALLATION_ID: '456',
                }),
                createDiagnostics(),
            );

            await expect(sut.listRepositories()).rejects.toThrow(ServiceUnavailableException);
            expect(OctokitMock).not.toHaveBeenCalled();
        });

        it('constructs Octokit with the decoded private key and app-auth strategy', async () => {
            const sut = new GithubAppProvider(
                createConfig({
                    GITHUB_APP_ID: '123',
                    GITHUB_APP_PRIVATE_KEY: Buffer.from('PEMKEY').toString('base64'),
                    GITHUB_APP_INSTALLATION_ID: '456',
                }),
                createDiagnostics(),
            );

            await sut.listRepositories();

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

        it('memoizes the client across calls, building Octokit only once', async () => {
            const sut = new GithubAppProvider(
                createConfig({
                    GITHUB_APP_ID: '123',
                    GITHUB_APP_PRIVATE_KEY: Buffer.from('PEMKEY').toString('base64'),
                    GITHUB_APP_INSTALLATION_ID: '456',
                }),
                createDiagnostics(),
            );

            await sut.listRepositories();
            await sut.listRepositories();

            expect(OctokitMock).toHaveBeenCalledTimes(1);
        });
    });
});
