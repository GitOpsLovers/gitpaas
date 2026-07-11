import { GitRepository } from '../../domain/models/git-repository.model';
import { ProvidersRepository } from '../../domain/repositories/providers.repository';
import { listRepositoriesUseCase } from '../list-repositories.use-case';

describe('listRepositoriesUseCase', () => {
    const repositories: GitRepository[] = [
        {
            id: 42, fullName: 'gitopslovers/artifactory', defaultBranch: 'main', private: true,
        },
    ];

    let repository: jest.Mocked<ProvidersRepository>;

    beforeEach(() => {
        repository = {
            listRepositories: jest.fn(),
            listBranches: jest.fn(),
            getFileContent: jest.fn(),
        };
    });

    it('delegates the lookup to the repository', async () => {
        repository.listRepositories.mockResolvedValue(repositories);

        await listRepositoriesUseCase(repository);

        expect(repository.listRepositories).toHaveBeenCalledTimes(1);
    });

    it('returns the repositories listed by the repository', async () => {
        repository.listRepositories.mockResolvedValue(repositories);

        const result = await listRepositoriesUseCase(repository);

        expect(result).toBe(repositories);
    });

    it('propagates errors thrown by the repository', async () => {
        const error = new Error('provider unavailable');
        repository.listRepositories.mockRejectedValue(error);

        await expect(listRepositoriesUseCase(repository)).rejects.toThrow(error);
    });
});
