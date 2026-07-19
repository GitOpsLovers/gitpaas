import { GitBranch } from '../../domain/models/git-branch.model';
import { ProvidersRepository } from '../../domain/repositories/providers.repository';
import { listBranchesUseCase } from '../list-branches.use-case';

describe('listBranchesUseCase', () => {
    const repositoryId = 42;

    const branches: GitBranch[] = [{ name: 'main' }, { name: 'develop' }];

    let mockProvidersRepository: jest.Mocked<Pick<ProvidersRepository, 'listBranches'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockProvidersRepository = {
            listBranches: jest.fn(),
        };
    });

    it('delegates the lookup to the repository with the provided repository id', async () => {
        mockProvidersRepository.listBranches.mockResolvedValue(branches);

        await listBranchesUseCase(mockProvidersRepository as unknown as ProvidersRepository, repositoryId);

        expect(mockProvidersRepository.listBranches).toHaveBeenCalledTimes(1);
        expect(mockProvidersRepository.listBranches).toHaveBeenCalledWith(repositoryId);
    });

    it('returns the branches listed by the repository', async () => {
        mockProvidersRepository.listBranches.mockResolvedValue(branches);

        const result = await listBranchesUseCase(mockProvidersRepository as unknown as ProvidersRepository, repositoryId);

        expect(result).toBe(branches);
    });

    it('propagates errors thrown by the repository', async () => {
        const error = new Error('provider unavailable');
        mockProvidersRepository.listBranches.mockRejectedValue(error);

        await expect(
            listBranchesUseCase(mockProvidersRepository as unknown as ProvidersRepository, repositoryId),
        ).rejects.toThrow(error);
    });
});
