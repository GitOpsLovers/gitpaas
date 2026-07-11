import { ServerPrunerRepository } from '../../domain/repositories/server-pruner.repository';
import { pruneImagesUseCase } from '../prune-images.use-case';

describe('pruneImagesUseCase', () => {
    let pruner: jest.Mocked<ServerPrunerRepository>;

    beforeEach(() => {
        pruner = {
            pruneImages: jest.fn(),
            pruneVolumes: jest.fn(),
            pruneContainers: jest.fn(),
        };
    });

    it('delegates to the pruner', async () => {
        pruner.pruneImages.mockResolvedValue({ deletedCount: 0, spaceReclaimed: 0 });

        await pruneImagesUseCase(pruner);

        expect(pruner.pruneImages).toHaveBeenCalledTimes(1);
    });

    it('returns the prune result from the pruner', async () => {
        const result = { deletedCount: 3, spaceReclaimed: 1024 };
        pruner.pruneImages.mockResolvedValue(result);

        expect(await pruneImagesUseCase(pruner)).toBe(result);
    });

    it('propagates errors thrown by the pruner', async () => {
        const error = new Error('daemon unreachable');
        pruner.pruneImages.mockRejectedValue(error);

        await expect(pruneImagesUseCase(pruner)).rejects.toThrow(error);
    });
});
