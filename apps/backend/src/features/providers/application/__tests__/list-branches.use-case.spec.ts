import { GitBranch } from '../../domain/models/git-branch.models';
import { ProviderCredentials } from '../../domain/models/provider.models';
import { ProviderClient } from '../../domain/ports/provider-client.port';
import { listBranchesUseCase } from '../list-branches.use-case';

describe('listBranchesUseCase', () => {
    const repositoryId = 42;

    const credentials: ProviderCredentials = {
        providerId: 'provider-id',
        appId: '1',
        installationId: '2',
        privateKey: 'pem',
    };

    const branches: GitBranch[] = [{ name: 'main' }, { name: 'develop' }];

    let mockProviderClient: jest.Mocked<Pick<ProviderClient, 'listBranches'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockProviderClient = {
            listBranches: jest.fn(),
        };
    });

    it('delegates the lookup to the repository with the provided repository id', async () => {
        mockProviderClient.listBranches.mockResolvedValue(branches);

        await listBranchesUseCase(mockProviderClient as unknown as ProviderClient, credentials, repositoryId);

        expect(mockProviderClient.listBranches).toHaveBeenCalledTimes(1);
        expect(mockProviderClient.listBranches).toHaveBeenCalledWith(credentials, repositoryId);
    });

    it('returns the branches listed by the repository', async () => {
        mockProviderClient.listBranches.mockResolvedValue(branches);

        const result = await listBranchesUseCase(mockProviderClient as unknown as ProviderClient, credentials, repositoryId);

        expect(result).toBe(branches);
    });

    it('propagates errors thrown by the repository', async () => {
        const error = new Error('provider unavailable');
        mockProviderClient.listBranches.mockRejectedValue(error);

        await expect(
            listBranchesUseCase(mockProviderClient as unknown as ProviderClient, credentials, repositoryId),
        ).rejects.toThrow(error);
    });
});
