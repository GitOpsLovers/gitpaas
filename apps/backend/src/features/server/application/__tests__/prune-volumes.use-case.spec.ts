import { ServerPrunerRepository } from '../../domain/repositories/server-pruner.repository';
import { pruneVolumesUseCase } from '../prune-volumes.use-case';

describe('pruneVolumesUseCase', () => {
    let mockPruner: jest.Mocked<Pick<ServerPrunerRepository, 'pruneVolumes'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockPruner = {
            pruneVolumes: jest.fn(),
        };
    });

    it('delegates to the pruner', async () => {
        mockPruner.pruneVolumes.mockResolvedValue({ deletedCount: 0, spaceReclaimed: 0 });

        await pruneVolumesUseCase(mockPruner as unknown as ServerPrunerRepository);

        expect(mockPruner.pruneVolumes).toHaveBeenCalledTimes(1);
    });

    it('returns the prune result from the pruner', async () => {
        const result = { deletedCount: 2, spaceReclaimed: 2048 };
        mockPruner.pruneVolumes.mockResolvedValue(result);

        expect(await pruneVolumesUseCase(mockPruner as unknown as ServerPrunerRepository)).toBe(result);
    });

    it('propagates errors thrown by the pruner', async () => {
        const error = new Error('daemon unreachable');
        mockPruner.pruneVolumes.mockRejectedValue(error);

        await expect(
            pruneVolumesUseCase(mockPruner as unknown as ServerPrunerRepository),
        ).rejects.toThrow(error);
    });
});
