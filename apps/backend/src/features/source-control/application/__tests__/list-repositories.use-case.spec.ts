import { GitRepository } from '../../domain/models/git-repository.models';
import { ProviderCredentials } from '../../domain/models/provider.models';
import { SourceControl } from '../../domain/ports/source-control.port';
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

    let mockSourceControl: jest.Mocked<Pick<SourceControl, 'listRepositories'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockSourceControl = {
            listRepositories: jest.fn(),
        };
    });

    it('delegates the lookup to the repository', async () => {
        mockSourceControl.listRepositories.mockResolvedValue(repositories);

        await listRepositoriesUseCase(mockSourceControl as unknown as SourceControl, credentials);

        expect(mockSourceControl.listRepositories).toHaveBeenCalledTimes(1);
        expect(mockSourceControl.listRepositories).toHaveBeenCalledWith(credentials);
    });

    it('returns the repositories listed by the repository', async () => {
        mockSourceControl.listRepositories.mockResolvedValue(repositories);

        const result = await listRepositoriesUseCase(mockSourceControl as unknown as SourceControl, credentials);

        expect(result).toBe(repositories);
    });

    it('propagates errors thrown by the repository', async () => {
        const error = new Error('provider unavailable');
        mockSourceControl.listRepositories.mockRejectedValue(error);

        await expect(
            listRepositoriesUseCase(mockSourceControl as unknown as SourceControl, credentials),
        ).rejects.toThrow(error);
    });
});
