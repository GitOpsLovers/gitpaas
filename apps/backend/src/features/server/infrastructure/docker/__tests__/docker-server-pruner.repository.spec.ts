import { PruneResult } from '../../../domain/models/prune-result.model';
import { DockerServerPrunerRepository } from '../docker-server-pruner.repository';

import { DockerClient } from '@core/infrastructure/docker/docker.client';

describe('DockerServerPrunerRepository', () => {
    let pruneImages: jest.Mock;
    let pruneVolumes: jest.Mock;
    let pruneContainers: jest.Mock;
    let client: jest.Mocked<DockerClient>;
    let repository: DockerServerPrunerRepository;

    beforeEach(() => {
        pruneImages = jest.fn().mockResolvedValue({});
        pruneVolumes = jest.fn().mockResolvedValue({});
        pruneContainers = jest.fn().mockResolvedValue({});
        client = {
            getClient: jest.fn().mockReturnValue({ pruneImages, pruneVolumes, pruneContainers }),
        } as unknown as jest.Mocked<DockerClient>;
        repository = new DockerServerPrunerRepository(client);
    });

    describe('pruneImages', () => {
        it('maps a populated daemon response into a PruneResult', async () => {
            pruneImages.mockResolvedValue({ ImagesDeleted: [{}, {}, {}], SpaceReclaimed: 1024 });

            const result = await repository.pruneImages();

            expect(pruneImages).toHaveBeenCalledTimes(1);
            expect(result).toEqual<PruneResult>({ deletedCount: 3, spaceReclaimed: 1024 });
        });

        it('falls back to zero counts when the daemon response is empty', async () => {
            pruneImages.mockResolvedValue({});

            const result = await repository.pruneImages();

            expect(result).toEqual<PruneResult>({ deletedCount: 0, spaceReclaimed: 0 });
        });
    });

    describe('pruneVolumes', () => {
        it('maps a populated daemon response into a PruneResult', async () => {
            pruneVolumes.mockResolvedValue({ VolumesDeleted: [{}, {}], SpaceReclaimed: 2048 });

            const result = await repository.pruneVolumes();

            expect(pruneVolumes).toHaveBeenCalledTimes(1);
            expect(result).toEqual<PruneResult>({ deletedCount: 2, spaceReclaimed: 2048 });
        });

        it('falls back to zero counts when the daemon response is empty', async () => {
            pruneVolumes.mockResolvedValue({});

            const result = await repository.pruneVolumes();

            expect(result).toEqual<PruneResult>({ deletedCount: 0, spaceReclaimed: 0 });
        });
    });

    describe('pruneContainers', () => {
        it('maps a populated daemon response into a PruneResult', async () => {
            pruneContainers.mockResolvedValue({ ContainersDeleted: [{}, {}, {}, {}], SpaceReclaimed: 4096 });

            const result = await repository.pruneContainers();

            expect(pruneContainers).toHaveBeenCalledTimes(1);
            expect(result).toEqual<PruneResult>({ deletedCount: 4, spaceReclaimed: 4096 });
        });

        it('falls back to zero counts when the daemon response is empty', async () => {
            pruneContainers.mockResolvedValue({});

            const result = await repository.pruneContainers();

            expect(result).toEqual<PruneResult>({ deletedCount: 0, spaceReclaimed: 0 });
        });
    });
});
