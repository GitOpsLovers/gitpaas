import { GitRepository } from '../../domain/models/git-repository.models';
import { SourceControl } from '../../domain/ports/source-control.port';
import { listRepositoriesUseCase } from '../list-repositories.use-case';

describe('listRepositoriesUseCase', () => {
    const repositories: GitRepository[] = [
        {
            id: 42, fullName: 'gitopslovers/gitpaas', defaultBranch: 'main', private: true,
        },
    ];

    let mockSourceControl: jest.Mocked<Pick<SourceControl, 'listRepositories'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockSourceControl = {
            listRepositories: jest.fn(),
        };
    });

    it('delegates the lookup to the repository', async () => {
        mockSourceControl.listRepositories.mockResolvedValue(repositories);

        await listRepositoriesUseCase(mockSourceControl as unknown as SourceControl);

        expect(mockSourceControl.listRepositories).toHaveBeenCalledTimes(1);
    });

    it('returns the repositories listed by the repository', async () => {
        mockSourceControl.listRepositories.mockResolvedValue(repositories);

        const result = await listRepositoriesUseCase(mockSourceControl as unknown as SourceControl);

        expect(result).toBe(repositories);
    });

    it('propagates errors thrown by the repository', async () => {
        const error = new Error('provider unavailable');
        mockSourceControl.listRepositories.mockRejectedValue(error);

        await expect(
            listRepositoriesUseCase(mockSourceControl as unknown as SourceControl),
        ).rejects.toThrow(error);
    });
});
