import { GitBranch } from '../../domain/models/git-branch.model';
import { ProvidersRepository } from '../../domain/repositories/providers.repository';
import { listBranchesUseCase } from '../list-branches.use-case';

describe('listBranchesUseCase', () => {
    const repositoryId = 42;

    const branches: GitBranch[] = [{ name: 'main' }, { name: 'develop' }];

    let repository: jest.Mocked<ProvidersRepository>;

    beforeEach(() => {
        repository = {
            listRepositories: jest.fn(),
            listBranches: jest.fn(),
            getFileContent: jest.fn(),
            getRepositoryArchive: jest.fn(),
        };
    });

    it('delegates the lookup to the repository with the provided repository id', async () => {
        repository.listBranches.mockResolvedValue(branches);

        await listBranchesUseCase(repository, repositoryId);

        expect(repository.listBranches).toHaveBeenCalledTimes(1);
        expect(repository.listBranches).toHaveBeenCalledWith(repositoryId);
    });

    it('returns the branches listed by the repository', async () => {
        repository.listBranches.mockResolvedValue(branches);

        const result = await listBranchesUseCase(repository, repositoryId);

        expect(result).toBe(branches);
    });

    it('propagates errors thrown by the repository', async () => {
        const error = new Error('provider unavailable');
        repository.listBranches.mockRejectedValue(error);

        await expect(listBranchesUseCase(repository, repositoryId)).rejects.toThrow(error);
    });
});
