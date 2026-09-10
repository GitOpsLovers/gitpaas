import type { PruneResult } from '@gitpaas/contracts';

import { DockerServerPrunerAdapter } from '../docker-server-pruner.adapter';

import { GITPAAS_MANAGED_LABEL, GITPAAS_MANAGED_VALUE } from '@core/domain/constants/gitpaas-labels.constants';
import type { RuntimePruneReport } from '@core/domain/models/container-runtime.models';
import { DockerContainerRuntimeAdapter } from '@core/infrastructure/docker/docker-container-runtime.adapter';
import { HOST_SELECTOR } from '@features/docker/domain/constants/docker-host.constants';

/**
 * Selector every prune must be scoped to, so nothing GitPaaS did not create is
 * ever reaped.
 */
const managedSelector = { labels: { [GITPAAS_MANAGED_LABEL]: GITPAAS_MANAGED_VALUE } };

/**
 * Builds a runtime prune report with the given deleted count and reclaimed bytes.
 */
const pruned = (deletedCount: number, spaceReclaimed: number): RuntimePruneReport => ({ deletedCount, spaceReclaimed });

describe('DockerServerPrunerAdapter', () => {
    let mockPruneImages: jest.Mock;
    let mockPruneVolumes: jest.Mock;
    let mockPruneContainers: jest.Mock;
    let mockPruneBuildCache: jest.Mock;
    let mockContainerRuntime: jest.Mocked<
        Pick<DockerContainerRuntimeAdapter, 'pruneImages' | 'pruneVolumes' | 'pruneContainers' | 'pruneBuildCache'>
    >;
    let sut: DockerServerPrunerAdapter;

    beforeEach(() => {
        jest.clearAllMocks();

        mockPruneImages = jest.fn().mockResolvedValue(pruned(0, 0));
        mockPruneVolumes = jest.fn().mockResolvedValue(pruned(0, 0));
        mockPruneContainers = jest.fn().mockResolvedValue(pruned(0, 0));
        mockPruneBuildCache = jest.fn().mockResolvedValue(pruned(0, 0));
        mockContainerRuntime = {
            pruneImages: mockPruneImages,
            pruneVolumes: mockPruneVolumes,
            pruneContainers: mockPruneContainers,
            pruneBuildCache: mockPruneBuildCache,
        };
        sut = new DockerServerPrunerAdapter(mockContainerRuntime as unknown as DockerContainerRuntimeAdapter);
    });

    describe('pruneImages', () => {
        it('maps a populated runtime report into a PruneResult', async () => {
            mockPruneImages.mockResolvedValue(pruned(3, 1024));

            const result = await sut.pruneImages();

            expect(mockPruneImages).toHaveBeenCalledTimes(1);
            expect(mockPruneImages).toHaveBeenCalledWith(managedSelector);
            expect(result).toEqual<PruneResult>({ deletedCount: 3, spaceReclaimed: 1024 });
        });

        it('passes a zeroed report straight through', async () => {
            mockPruneImages.mockResolvedValue(pruned(0, 0));

            const result = await sut.pruneImages();

            expect(result).toEqual<PruneResult>({ deletedCount: 0, spaceReclaimed: 0 });
        });
    });

    describe('pruneVolumes', () => {
        it('maps a populated runtime report into a PruneResult', async () => {
            mockPruneVolumes.mockResolvedValue(pruned(2, 2048));

            const result = await sut.pruneVolumes();

            expect(mockPruneVolumes).toHaveBeenCalledTimes(1);
            expect(mockPruneVolumes).toHaveBeenCalledWith(managedSelector);
            expect(result).toEqual<PruneResult>({ deletedCount: 2, spaceReclaimed: 2048 });
        });

        it('passes a zeroed report straight through', async () => {
            mockPruneVolumes.mockResolvedValue(pruned(0, 0));

            const result = await sut.pruneVolumes();

            expect(result).toEqual<PruneResult>({ deletedCount: 0, spaceReclaimed: 0 });
        });
    });

    describe('pruneContainers', () => {
        it('maps a populated runtime report into a PruneResult', async () => {
            mockPruneContainers.mockResolvedValue(pruned(4, 4096));

            const result = await sut.pruneContainers();

            expect(mockPruneContainers).toHaveBeenCalledTimes(1);
            expect(mockPruneContainers).toHaveBeenCalledWith(managedSelector);
            expect(result).toEqual<PruneResult>({ deletedCount: 4, spaceReclaimed: 4096 });
        });

        it('passes a zeroed report straight through', async () => {
            mockPruneContainers.mockResolvedValue(pruned(0, 0));

            const result = await sut.pruneContainers();

            expect(result).toEqual<PruneResult>({ deletedCount: 0, spaceReclaimed: 0 });
        });
    });

    describe('pruneHost', () => {
        it('prunes the images and the containers of the whole host, with no filter of the label', async () => {
            await sut.pruneHost();

            expect(mockPruneImages).toHaveBeenCalledTimes(1);
            expect(mockPruneImages).toHaveBeenCalledWith(HOST_SELECTOR);
            expect(mockPruneContainers).toHaveBeenCalledTimes(1);
            expect(mockPruneContainers).toHaveBeenCalledWith(HOST_SELECTOR);
        });

        it('carries no label of GitPaaS in the selector it sends', async () => {
            await sut.pruneHost();

            expect(mockPruneImages).not.toHaveBeenCalledWith(managedSelector);
            expect(mockPruneContainers).not.toHaveBeenCalledWith(managedSelector);
            expect(mockPruneImages.mock.calls[0][0]).not.toHaveProperty('labels');
            expect(mockPruneContainers.mock.calls[0][0]).not.toHaveProperty('labels');
        });

        it('never prunes a volume', async () => {
            await sut.pruneHost();

            expect(mockPruneVolumes).not.toHaveBeenCalled();
        });

        it('sums the two reports into a single PruneResult', async () => {
            mockPruneImages.mockResolvedValue(pruned(3, 1024));
            mockPruneContainers.mockResolvedValue(pruned(4, 2048));

            const result = await sut.pruneHost();

            expect(result).toEqual<PruneResult>({ deletedCount: 7, spaceReclaimed: 3072 });
        });

        it('returns a zeroed result when the host holds nothing to reclaim', async () => {
            const result = await sut.pruneHost();

            expect(result).toEqual<PruneResult>({ deletedCount: 0, spaceReclaimed: 0 });
        });

        it('propagates a failure of the image prune, and never prunes the containers', async () => {
            const error = new Error('daemon unreachable');
            mockPruneImages.mockRejectedValue(error);

            await expect(sut.pruneHost()).rejects.toThrow(error);
            expect(mockPruneContainers).not.toHaveBeenCalled();
        });
    });

    describe('pruneBuildCache', () => {
        it('maps a populated runtime report into a PruneResult', async () => {
            mockPruneBuildCache.mockResolvedValue(pruned(5, 8192));

            const result = await sut.pruneBuildCache();

            expect(mockPruneBuildCache).toHaveBeenCalledTimes(1);
            expect(mockPruneBuildCache).toHaveBeenCalledWith();
            expect(result).toEqual<PruneResult>({ deletedCount: 5, spaceReclaimed: 8192 });
        });

        it('passes a zeroed report straight through', async () => {
            const result = await sut.pruneBuildCache();

            expect(result).toEqual<PruneResult>({ deletedCount: 0, spaceReclaimed: 0 });
        });

        it('never prunes an image, a container or a volume', async () => {
            await sut.pruneBuildCache();

            expect(mockPruneImages).not.toHaveBeenCalled();
            expect(mockPruneContainers).not.toHaveBeenCalled();
            expect(mockPruneVolumes).not.toHaveBeenCalled();
        });
    });
});
