import { ServerPruner } from '../../domain/ports/server-pruner.port';
import { pruneBuildCacheUseCase } from '../prune-build-cache.use-case';

describe('pruneBuildCacheUseCase', () => {
    let mockPruner: jest.Mocked<Pick<ServerPruner, 'pruneBuildCache'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockPruner = {
            pruneBuildCache: jest.fn(),
        };
    });

    it('delegates to the pruner', async () => {
        mockPruner.pruneBuildCache.mockResolvedValue({ deletedCount: 0, spaceReclaimed: 0 });

        await pruneBuildCacheUseCase(mockPruner as unknown as ServerPruner);

        expect(mockPruner.pruneBuildCache).toHaveBeenCalledTimes(1);
    });

    it('returns the prune result from the pruner', async () => {
        const result = { deletedCount: 5, spaceReclaimed: 8192 };
        mockPruner.pruneBuildCache.mockResolvedValue(result);

        expect(await pruneBuildCacheUseCase(mockPruner as unknown as ServerPruner)).toBe(result);
    });

    it('propagates errors thrown by the pruner', async () => {
        const error = new Error('daemon unreachable');
        mockPruner.pruneBuildCache.mockRejectedValue(error);

        await expect(
            pruneBuildCacheUseCase(mockPruner as unknown as ServerPruner),
        ).rejects.toThrow(error);
    });
});
