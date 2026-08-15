import { GitRepository } from '../../domain/models/git-repository.models';
import { ProviderCredentials } from '../../domain/models/provider.models';
import { ProviderClient } from '../../domain/ports/provider-client.port';
import { listRepositoriesUseCase } from '../list-repositories.use-case';

describe('listRepositoriesUseCase', () => {
    const credentials: ProviderCredentials = {
        providerId: 'provider-id',
        appId: '1',
        installationId: '2',
        privateKey: 'pem',
    };

    const repositories: GitRepository[] = [
        {
            id: 42, fullName: 'gitopslovers/gitpaas', defaultBranch: 'main', private: true,
        },
    ];

    let mockProviderClient: jest.Mocked<Pick<ProviderClient, 'listRepositories'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockProviderClient = {
            listRepositories: jest.fn(),
        };
    });

    it('delegates the lookup to the repository', async () => {
        mockProviderClient.listRepositories.mockResolvedValue(repositories);

        await listRepositoriesUseCase(mockProviderClient as unknown as ProviderClient, credentials);

        expect(mockProviderClient.listRepositories).toHaveBeenCalledTimes(1);
        expect(mockProviderClient.listRepositories).toHaveBeenCalledWith(credentials);
    });

    it('returns the repositories listed by the repository', async () => {
        mockProviderClient.listRepositories.mockResolvedValue(repositories);

        const result = await listRepositoriesUseCase(mockProviderClient as unknown as ProviderClient, credentials);

        expect(result).toBe(repositories);
    });

    it('propagates errors thrown by the repository', async () => {
        const error = new Error('provider unavailable');
        mockProviderClient.listRepositories.mockRejectedValue(error);

        await expect(
            listRepositoriesUseCase(mockProviderClient as unknown as ProviderClient, credentials),
        ).rejects.toThrow(error);
    });
});
