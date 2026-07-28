import { GitRepository } from '../../domain/models/git-repository.models';
import { Providers } from '../../domain/ports/providers.port';
import { listRepositoriesUseCase } from '../list-repositories.use-case';

describe('listRepositoriesUseCase', () => {
    const repositories: GitRepository[] = [
        {
            id: 42, fullName: 'gitopslovers/gitpaas', defaultBranch: 'main', private: true,
        },
    ];

    let mockProviders: jest.Mocked<Pick<Providers, 'listRepositories'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockProviders = {
            listRepositories: jest.fn(),
        };
    });

    it('delegates the lookup to the repository', async () => {
        mockProviders.listRepositories.mockResolvedValue(repositories);

        await listRepositoriesUseCase(mockProviders as unknown as Providers);

        expect(mockProviders.listRepositories).toHaveBeenCalledTimes(1);
    });

    it('returns the repositories listed by the repository', async () => {
        mockProviders.listRepositories.mockResolvedValue(repositories);

        const result = await listRepositoriesUseCase(mockProviders as unknown as Providers);

        expect(result).toBe(repositories);
    });

    it('propagates errors thrown by the repository', async () => {
        const error = new Error('provider unavailable');
        mockProviders.listRepositories.mockRejectedValue(error);

        await expect(
            listRepositoriesUseCase(mockProviders as unknown as Providers),
        ).rejects.toThrow(error);
    });
});
