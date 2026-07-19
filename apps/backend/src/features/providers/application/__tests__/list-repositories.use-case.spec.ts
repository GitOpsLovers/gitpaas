import { GitRepository } from '../../domain/models/git-repository.model';
import { ProvidersRepository } from '../../domain/repositories/providers.repository';
import { listRepositoriesUseCase } from '../list-repositories.use-case';

describe('listRepositoriesUseCase', () => {
    const repositories: GitRepository[] = [
        {
            id: 42, fullName: 'gitopslovers/gitpaas', defaultBranch: 'main', private: true,
        },
    ];

    let mockProvidersRepository: jest.Mocked<Pick<ProvidersRepository, 'listRepositories'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockProvidersRepository = {
            listRepositories: jest.fn(),
        };
    });

    it('delegates the lookup to the repository', async () => {
        mockProvidersRepository.listRepositories.mockResolvedValue(repositories);

        await listRepositoriesUseCase(mockProvidersRepository as unknown as ProvidersRepository);

        expect(mockProvidersRepository.listRepositories).toHaveBeenCalledTimes(1);
    });

    it('returns the repositories listed by the repository', async () => {
        mockProvidersRepository.listRepositories.mockResolvedValue(repositories);

        const result = await listRepositoriesUseCase(mockProvidersRepository as unknown as ProvidersRepository);

        expect(result).toBe(repositories);
    });

    it('propagates errors thrown by the repository', async () => {
        const error = new Error('provider unavailable');
        mockProvidersRepository.listRepositories.mockRejectedValue(error);

        await expect(
            listRepositoriesUseCase(mockProvidersRepository as unknown as ProvidersRepository),
        ).rejects.toThrow(error);
    });
});
