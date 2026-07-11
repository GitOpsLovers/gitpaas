import { ServerPrunerRepository } from '../../domain/repositories/server-pruner.repository';
import { pruneContainersUseCase } from '../prune-containers.use-case';

describe('pruneContainersUseCase', () => {
    let pruner: jest.Mocked<ServerPrunerRepository>;

    beforeEach(() => {
        pruner = {
            pruneImages: jest.fn(),
            pruneVolumes: jest.fn(),
            pruneContainers: jest.fn(),
        };
    });

    it('delegates to the pruner', async () => {
        pruner.pruneContainers.mockResolvedValue({ deletedCount: 0, spaceReclaimed: 0 });

        await pruneContainersUseCase(pruner);

        expect(pruner.pruneContainers).toHaveBeenCalledTimes(1);
    });

    it('returns the prune result from the pruner', async () => {
        const result = { deletedCount: 5, spaceReclaimed: 4096 };
        pruner.pruneContainers.mockResolvedValue(result);

        expect(await pruneContainersUseCase(pruner)).toBe(result);
    });

    it('propagates errors thrown by the pruner', async () => {
        const error = new Error('daemon unreachable');
        pruner.pruneContainers.mockRejectedValue(error);

        await expect(pruneContainersUseCase(pruner)).rejects.toThrow(error);
    });
});
