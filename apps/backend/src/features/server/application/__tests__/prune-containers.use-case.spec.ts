import { ServerPrunerRepository } from '../../domain/repositories/server-pruner.repository';
import { pruneContainersUseCase } from '../prune-containers.use-case';

describe('pruneContainersUseCase', () => {
    let mockPruner: jest.Mocked<Pick<ServerPrunerRepository, 'pruneContainers'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockPruner = {
            pruneContainers: jest.fn(),
        };
    });

    it('delegates to the pruner', async () => {
        mockPruner.pruneContainers.mockResolvedValue({ deletedCount: 0, spaceReclaimed: 0 });

        await pruneContainersUseCase(mockPruner as unknown as ServerPrunerRepository);

        expect(mockPruner.pruneContainers).toHaveBeenCalledTimes(1);
    });

    it('returns the prune result from the pruner', async () => {
        const result = { deletedCount: 5, spaceReclaimed: 4096 };
        mockPruner.pruneContainers.mockResolvedValue(result);

        expect(await pruneContainersUseCase(mockPruner as unknown as ServerPrunerRepository)).toBe(result);
    });

    it('propagates errors thrown by the pruner', async () => {
        const error = new Error('daemon unreachable');
        mockPruner.pruneContainers.mockRejectedValue(error);

        await expect(
            pruneContainersUseCase(mockPruner as unknown as ServerPrunerRepository),
        ).rejects.toThrow(error);
    });
});
