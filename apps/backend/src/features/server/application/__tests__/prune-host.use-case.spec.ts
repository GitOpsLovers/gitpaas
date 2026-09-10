import { ServerPruner } from '../../domain/ports/server-pruner.port';
import { pruneHostUseCase } from '../prune-host.use-case';

describe('pruneHostUseCase', () => {
    let mockPruner: jest.Mocked<Pick<ServerPruner, 'pruneHost' | 'pruneVolumes'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockPruner = {
            pruneHost: jest.fn(),
            pruneVolumes: jest.fn(),
        };
    });

    it('delegates to the pruner', async () => {
        mockPruner.pruneHost.mockResolvedValue({ deletedCount: 0, spaceReclaimed: 0 });

        await pruneHostUseCase(mockPruner as unknown as ServerPruner);

        expect(mockPruner.pruneHost).toHaveBeenCalledTimes(1);
    });

    it('never prunes a volume', async () => {
        mockPruner.pruneHost.mockResolvedValue({ deletedCount: 0, spaceReclaimed: 0 });

        await pruneHostUseCase(mockPruner as unknown as ServerPruner);

        expect(mockPruner.pruneVolumes).not.toHaveBeenCalled();
    });

    it('returns the prune result from the pruner', async () => {
        const result = { deletedCount: 7, spaceReclaimed: 3072 };
        mockPruner.pruneHost.mockResolvedValue(result);

        expect(await pruneHostUseCase(mockPruner as unknown as ServerPruner)).toBe(result);
    });

    it('propagates errors thrown by the pruner', async () => {
        const error = new Error('daemon unreachable');
        mockPruner.pruneHost.mockRejectedValue(error);

        await expect(
            pruneHostUseCase(mockPruner as unknown as ServerPruner),
        ).rejects.toThrow(error);
    });
});
