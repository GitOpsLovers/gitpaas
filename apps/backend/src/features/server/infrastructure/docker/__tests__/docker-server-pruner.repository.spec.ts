import type Docker from 'dockerode';

import { PruneResult } from '../../../domain/models/prune-result.model';
import { DockerServerPrunerRepository } from '../docker-server-pruner.repository';

import { DockerClient } from '@core/infrastructure/docker/docker.client';

/**
 * Builds a Dockerode image-prune response with the given deleted count and reclaimed bytes.
 */
const imagesPruned = (deletedCount: number, spaceReclaimed: number): Docker.PruneImagesInfo => ({
    ImagesDeleted: Array.from({ length: deletedCount }, () => ({})),
    SpaceReclaimed: spaceReclaimed,
} as Docker.PruneImagesInfo);

/**
 * Builds a Dockerode volume-prune response with the given deleted count and reclaimed bytes.
 */
const volumesPruned = (deletedCount: number, spaceReclaimed: number): Docker.PruneVolumesInfo => (({
    VolumesDeleted: Array.from({ length: deletedCount }, (_, index) => `vol-${index}`),
    SpaceReclaimed: spaceReclaimed,
}));

/**
 * Builds a Dockerode container-prune response with the given deleted count and reclaimed bytes.
 */
const containersPruned = (deletedCount: number, spaceReclaimed: number): Docker.PruneContainersInfo => (({
    ContainersDeleted: Array.from({ length: deletedCount }, (_, index) => `ctr-${index}`),
    SpaceReclaimed: spaceReclaimed,
}));

describe('DockerServerPrunerRepository', () => {
    let mockPruneImages: jest.Mock;
    let mockPruneVolumes: jest.Mock;
    let mockPruneContainers: jest.Mock;
    let mockDockerClient: jest.Mocked<Pick<DockerClient, 'getClient'>>;
    let sut: DockerServerPrunerRepository;

    beforeEach(() => {
        jest.clearAllMocks();

        mockPruneImages = jest.fn().mockResolvedValue({});
        mockPruneVolumes = jest.fn().mockResolvedValue({});
        mockPruneContainers = jest.fn().mockResolvedValue({});
        const handle = {
            pruneImages: mockPruneImages,
            pruneVolumes: mockPruneVolumes,
            pruneContainers: mockPruneContainers,
        } as unknown as jest.Mocked<Pick<Docker, 'pruneImages' | 'pruneVolumes' | 'pruneContainers'>>;
        mockDockerClient = { getClient: jest.fn().mockReturnValue(handle) };
        sut = new DockerServerPrunerRepository(mockDockerClient as unknown as DockerClient);
    });

    describe('pruneImages', () => {
        it('maps a populated daemon response into a PruneResult', async () => {
            mockPruneImages.mockResolvedValue(imagesPruned(3, 1024));

            const result = await sut.pruneImages();

            expect(mockPruneImages).toHaveBeenCalledTimes(1);
            expect(result).toEqual<PruneResult>({ deletedCount: 3, spaceReclaimed: 1024 });
        });

        it('falls back to zero counts when the daemon response is empty', async () => {
            mockPruneImages.mockResolvedValue({});

            const result = await sut.pruneImages();

            expect(result).toEqual<PruneResult>({ deletedCount: 0, spaceReclaimed: 0 });
        });
    });

    describe('pruneVolumes', () => {
        it('maps a populated daemon response into a PruneResult', async () => {
            mockPruneVolumes.mockResolvedValue(volumesPruned(2, 2048));

            const result = await sut.pruneVolumes();

            expect(mockPruneVolumes).toHaveBeenCalledTimes(1);
            expect(result).toEqual<PruneResult>({ deletedCount: 2, spaceReclaimed: 2048 });
        });

        it('falls back to zero counts when the daemon response is empty', async () => {
            mockPruneVolumes.mockResolvedValue({});

            const result = await sut.pruneVolumes();

            expect(result).toEqual<PruneResult>({ deletedCount: 0, spaceReclaimed: 0 });
        });
    });

    describe('pruneContainers', () => {
        it('maps a populated daemon response into a PruneResult', async () => {
            mockPruneContainers.mockResolvedValue(containersPruned(4, 4096));

            const result = await sut.pruneContainers();

            expect(mockPruneContainers).toHaveBeenCalledTimes(1);
            expect(result).toEqual<PruneResult>({ deletedCount: 4, spaceReclaimed: 4096 });
        });

        it('falls back to zero counts when the daemon response is empty', async () => {
            mockPruneContainers.mockResolvedValue({});

            const result = await sut.pruneContainers();

            expect(result).toEqual<PruneResult>({ deletedCount: 0, spaceReclaimed: 0 });
        });
    });
});
