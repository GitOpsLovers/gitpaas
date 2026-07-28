import { GitBranch } from '../../domain/models/git-branch.models';
import { Providers } from '../../domain/ports/providers.port';
import { listBranchesUseCase } from '../list-branches.use-case';

describe('listBranchesUseCase', () => {
    const repositoryId = 42;

    const branches: GitBranch[] = [{ name: 'main' }, { name: 'develop' }];

    let mockProviders: jest.Mocked<Pick<Providers, 'listBranches'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockProviders = {
            listBranches: jest.fn(),
        };
    });

    it('delegates the lookup to the repository with the provided repository id', async () => {
        mockProviders.listBranches.mockResolvedValue(branches);

        await listBranchesUseCase(mockProviders as unknown as Providers, repositoryId);

        expect(mockProviders.listBranches).toHaveBeenCalledTimes(1);
        expect(mockProviders.listBranches).toHaveBeenCalledWith(repositoryId);
    });

    it('returns the branches listed by the repository', async () => {
        mockProviders.listBranches.mockResolvedValue(branches);

        const result = await listBranchesUseCase(mockProviders as unknown as Providers, repositoryId);

        expect(result).toBe(branches);
    });

    it('propagates errors thrown by the repository', async () => {
        const error = new Error('provider unavailable');
        mockProviders.listBranches.mockRejectedValue(error);

        await expect(
            listBranchesUseCase(mockProviders as unknown as Providers, repositoryId),
        ).rejects.toThrow(error);
    });
});
