import { ServerPrunerRepository } from '../../domain/repositories/server-pruner.repository';
import { pruneImagesUseCase } from '../prune-images.use-case';

describe('pruneImagesUseCase', () => {
    let mockPruner: jest.Mocked<Pick<ServerPrunerRepository, 'pruneImages'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockPruner = {
            pruneImages: jest.fn(),
        };
    });

    it('delegates to the pruner', async () => {
        mockPruner.pruneImages.mockResolvedValue({ deletedCount: 0, spaceReclaimed: 0 });

        await pruneImagesUseCase(mockPruner as unknown as ServerPrunerRepository);

        expect(mockPruner.pruneImages).toHaveBeenCalledTimes(1);
    });

    it('returns the prune result from the pruner', async () => {
        const result = { deletedCount: 3, spaceReclaimed: 1024 };
        mockPruner.pruneImages.mockResolvedValue(result);

        expect(await pruneImagesUseCase(mockPruner as unknown as ServerPrunerRepository)).toBe(result);
    });

    it('propagates errors thrown by the pruner', async () => {
        const error = new Error('daemon unreachable');
        mockPruner.pruneImages.mockRejectedValue(error);

        await expect(
            pruneImagesUseCase(mockPruner as unknown as ServerPrunerRepository),
        ).rejects.toThrow(error);
    });
});
