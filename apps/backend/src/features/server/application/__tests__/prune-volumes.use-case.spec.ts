import { ServerPrunerRepository } from '../../domain/repositories/server-pruner.repository';
import { pruneVolumesUseCase } from '../prune-volumes.use-case';

describe('pruneVolumesUseCase', () => {
    let pruner: jest.Mocked<ServerPrunerRepository>;

    beforeEach(() => {
        pruner = {
            pruneImages: jest.fn(),
            pruneVolumes: jest.fn(),
            pruneContainers: jest.fn(),
        };
    });

    it('delegates to the pruner', async () => {
        pruner.pruneVolumes.mockResolvedValue({ deletedCount: 0, spaceReclaimed: 0 });

        await pruneVolumesUseCase(pruner);

        expect(pruner.pruneVolumes).toHaveBeenCalledTimes(1);
    });

    it('returns the prune result from the pruner', async () => {
        const result = { deletedCount: 2, spaceReclaimed: 2048 };
        pruner.pruneVolumes.mockResolvedValue(result);

        expect(await pruneVolumesUseCase(pruner)).toBe(result);
    });

    it('propagates errors thrown by the pruner', async () => {
        const error = new Error('daemon unreachable');
        pruner.pruneVolumes.mockRejectedValue(error);

        await expect(pruneVolumesUseCase(pruner)).rejects.toThrow(error);
    });
});
