import { PruneResult } from '../../../domain/models/prune-result.models';
import { ServerPrunerDockerAdapter } from '../server-pruner-docker.adapter';

import { GITPAAS_MANAGED_LABEL, GITPAAS_MANAGED_VALUE } from '@core/domain/constants/gitpaas-labels.constants';
import type { RuntimePruneReport } from '@core/domain/models/container-runtime.models';
import { DockerContainerRuntimeAdapter } from '@core/infrastructure/docker/container-runtime-docker.adapter';

/**
 * Selector every prune must be scoped to, so nothing GitPaaS did not create is
 * ever reaped.
 */
const managedSelector = { labels: { [GITPAAS_MANAGED_LABEL]: GITPAAS_MANAGED_VALUE } };

/**
 * Builds a runtime prune report with the given deleted count and reclaimed bytes.
 */
const pruned = (deletedCount: number, spaceReclaimed: number): RuntimePruneReport => ({ deletedCount, spaceReclaimed });

describe('ServerPrunerDockerAdapter', () => {
    let mockPruneImages: jest.Mock;
    let mockPruneVolumes: jest.Mock;
    let mockPruneContainers: jest.Mock;
    let mockContainerRuntime: jest.Mocked<Pick<DockerContainerRuntimeAdapter, 'pruneImages' | 'pruneVolumes' | 'pruneContainers'>>;
    let sut: ServerPrunerDockerAdapter;

    beforeEach(() => {
        jest.clearAllMocks();

        mockPruneImages = jest.fn().mockResolvedValue(pruned(0, 0));
        mockPruneVolumes = jest.fn().mockResolvedValue(pruned(0, 0));
        mockPruneContainers = jest.fn().mockResolvedValue(pruned(0, 0));
        mockContainerRuntime = {
            pruneImages: mockPruneImages,
            pruneVolumes: mockPruneVolumes,
            pruneContainers: mockPruneContainers,
        };
        sut = new ServerPrunerDockerAdapter(mockContainerRuntime as unknown as DockerContainerRuntimeAdapter);
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
});
