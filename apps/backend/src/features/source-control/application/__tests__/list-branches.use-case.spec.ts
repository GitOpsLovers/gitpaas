import { GitBranch } from '../../domain/models/git-branch.models';
import { SourceControl } from '../../domain/ports/source-control.port';
import { listBranchesUseCase } from '../list-branches.use-case';

describe('listBranchesUseCase', () => {
    const repositoryId = 42;

    const branches: GitBranch[] = [{ name: 'main' }, { name: 'develop' }];

    let mockSourceControl: jest.Mocked<Pick<SourceControl, 'listBranches'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockSourceControl = {
            listBranches: jest.fn(),
        };
    });

    it('delegates the lookup to the repository with the provided repository id', async () => {
        mockSourceControl.listBranches.mockResolvedValue(branches);

        await listBranchesUseCase(mockSourceControl as unknown as SourceControl, repositoryId);

        expect(mockSourceControl.listBranches).toHaveBeenCalledTimes(1);
        expect(mockSourceControl.listBranches).toHaveBeenCalledWith(repositoryId);
    });

    it('returns the branches listed by the repository', async () => {
        mockSourceControl.listBranches.mockResolvedValue(branches);

        const result = await listBranchesUseCase(mockSourceControl as unknown as SourceControl, repositoryId);

        expect(result).toBe(branches);
    });

    it('propagates errors thrown by the repository', async () => {
        const error = new Error('provider unavailable');
        mockSourceControl.listBranches.mockRejectedValue(error);

        await expect(
            listBranchesUseCase(mockSourceControl as unknown as SourceControl, repositoryId),
        ).rejects.toThrow(error);
    });
});
