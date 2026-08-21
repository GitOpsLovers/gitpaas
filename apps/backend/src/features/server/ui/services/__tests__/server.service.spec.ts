import type { OrphanRemovalResult, PlatformSettings, PruneResult, ReadinessResult } from '@gitpaas/contracts';
import { Test } from '@nestjs/testing';

import { checkReadinessUseCase } from '../../../application/check-readiness.use-case';
import { getPlatformSettingsUseCase } from '../../../application/get-platform-settings.use-case';
import { getServerStatusUseCase } from '../../../application/get-server-status.use-case';
import { pruneContainersUseCase } from '../../../application/prune-containers.use-case';
import { pruneImagesUseCase } from '../../../application/prune-images.use-case';
import { pruneVolumesUseCase } from '../../../application/prune-volumes.use-case';
import { removeOrphanedContainersUseCase } from '../../../application/remove-orphaned-containers.use-case';
import { updatePlatformSettingsUseCase } from '../../../application/update-platform-settings.use-case';
import { InvalidLogRetentionError } from '../../../domain/errors/server.errors';
import { DatabasePlatformSettingsRepository } from '../../../infrastructure/database/db-platform-settings.repository';
import { DockerOrphanContainersAdapter } from '../../../infrastructure/docker/docker-orphan-containers.adapter';
import { DockerServerPrunerAdapter } from '../../../infrastructure/docker/docker-server-pruner.adapter';
import { DockerHealthProbeAdapter } from '../../../infrastructure/health/docker-health-probe.adapter';
import { PostgresHealthProbeAdapter } from '../../../infrastructure/health/postgres-health-probe.adapter';
import { ServerService } from '../server.service';

import { ContainerRuntimeInfo } from '@core/domain/models/container-runtime.models';
import { DockerContainerRuntimeAdapter } from '@core/infrastructure/docker/docker-container-runtime.adapter';
import { DatabaseServicesRepository } from '@features/services/infrastructure/database/db-services.repository';

jest.mock('../../../application/prune-images.use-case');
jest.mock('../../../application/prune-volumes.use-case');
jest.mock('../../../application/prune-containers.use-case');
jest.mock('../../../application/remove-orphaned-containers.use-case');
jest.mock('../../../application/check-readiness.use-case');
jest.mock('../../../application/get-server-status.use-case');
jest.mock('../../../application/get-platform-settings.use-case');
jest.mock('../../../application/update-platform-settings.use-case');

const mockGetServerStatusUseCase = getServerStatusUseCase as jest.MockedFunction<
    typeof getServerStatusUseCase
>;
const mockCheckReadinessUseCase = checkReadinessUseCase as jest.MockedFunction<
    typeof checkReadinessUseCase
>;
const mockPruneImagesUseCase = pruneImagesUseCase as jest.MockedFunction<typeof pruneImagesUseCase>;
const mockPruneVolumesUseCase = pruneVolumesUseCase as jest.MockedFunction<
    typeof pruneVolumesUseCase
>;
const mockPruneContainersUseCase = pruneContainersUseCase as jest.MockedFunction<
    typeof pruneContainersUseCase
>;
const mockRemoveOrphanedContainersUseCase = removeOrphanedContainersUseCase as jest.MockedFunction<
    typeof removeOrphanedContainersUseCase
>;
const mockGetPlatformSettingsUseCase = getPlatformSettingsUseCase as jest.MockedFunction<
    typeof getPlatformSettingsUseCase
>;
const mockUpdatePlatformSettingsUseCase = updatePlatformSettingsUseCase as jest.MockedFunction<
    typeof updatePlatformSettingsUseCase
>;

const imagesResult: PruneResult = { deletedCount: 3, spaceReclaimed: 1_048_576 };
const volumesResult: PruneResult = { deletedCount: 2, spaceReclaimed: 524_288 };
const containersResult: PruneResult = { deletedCount: 5, spaceReclaimed: 0 };
const emptyResult: PruneResult = { deletedCount: 0, spaceReclaimed: 0 };
const orphanResult: OrphanRemovalResult = { removed: 2, names: ['stale-app-1', 'ghost-app-1'] };
const runtimeInfo: ContainerRuntimeInfo = {
    serverVersion: '27.1.1',
    operatingSystem: 'Ubuntu 24.04',
    containers: 4,
    images: 12,
};
const platformSettings: PlatformSettings = { logRetentionDays: 45 };
const readinessResult: ReadinessResult = {
    status: 'ok',
    dependencies: [
        { name: 'postgres', status: 'up' },
        { name: 'docker', status: 'up' },
    ],
};

describe('ServerService', () => {
    let mockPruner: jest.Mocked<DockerServerPrunerAdapter>;
    let mockOrphanContainers: jest.Mocked<DockerOrphanContainersAdapter>;
    let mockServices: jest.Mocked<DatabaseServicesRepository>;
    let mockPostgresProbe: jest.Mocked<PostgresHealthProbeAdapter>;
    let mockDockerProbe: jest.Mocked<DockerHealthProbeAdapter>;
    let mockContainerRuntime: jest.Mocked<DockerContainerRuntimeAdapter>;
    let mockPlatformSettings: jest.Mocked<DatabasePlatformSettingsRepository>;
    let sut: ServerService;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockPruner = {} as jest.Mocked<DockerServerPrunerAdapter>;
        mockOrphanContainers = {} as jest.Mocked<DockerOrphanContainersAdapter>;
        mockServices = {} as jest.Mocked<DatabaseServicesRepository>;
        mockPostgresProbe = { name: 'postgres', check: jest.fn() } as unknown as jest.Mocked<PostgresHealthProbeAdapter>;
        mockDockerProbe = { name: 'docker', check: jest.fn() } as unknown as jest.Mocked<DockerHealthProbeAdapter>;
        mockContainerRuntime = {} as jest.Mocked<DockerContainerRuntimeAdapter>;
        mockPlatformSettings = {} as jest.Mocked<DatabasePlatformSettingsRepository>;

        const moduleRef = await Test.createTestingModule({
            providers: [
                ServerService,
                { provide: DockerServerPrunerAdapter, useValue: mockPruner },
                { provide: DockerOrphanContainersAdapter, useValue: mockOrphanContainers },
                { provide: DatabaseServicesRepository, useValue: mockServices },
                { provide: PostgresHealthProbeAdapter, useValue: mockPostgresProbe },
                { provide: DockerHealthProbeAdapter, useValue: mockDockerProbe },
                { provide: DockerContainerRuntimeAdapter, useValue: mockContainerRuntime },
                { provide: DatabasePlatformSettingsRepository, useValue: mockPlatformSettings },
            ],
        }).compile();

        sut = moduleRef.get(ServerService);
    });

    describe('pruneImages', () => {
        it('delegates to the prune images use case with the pruner repository', async () => {
            mockPruneImagesUseCase.mockResolvedValue(imagesResult);

            await sut.pruneImages();

            expect(mockPruneImagesUseCase).toHaveBeenCalledTimes(1);
            expect(mockPruneImagesUseCase).toHaveBeenCalledWith(mockPruner);
        });

        it('returns the prune result produced by the use case', async () => {
            mockPruneImagesUseCase.mockResolvedValue(imagesResult);

            const result = await sut.pruneImages();

            expect(result).toBe(imagesResult);
        });

        it('returns a zeroed result when nothing was reclaimed', async () => {
            mockPruneImagesUseCase.mockResolvedValue(emptyResult);

            const result = await sut.pruneImages();

            expect(result).toEqual({ deletedCount: 0, spaceReclaimed: 0 });
        });

        it('never touches the other prune use cases', async () => {
            mockPruneImagesUseCase.mockResolvedValue(imagesResult);

            await sut.pruneImages();

            expect(mockPruneVolumesUseCase).not.toHaveBeenCalled();
            expect(mockPruneContainersUseCase).not.toHaveBeenCalled();
        });

        it('propagates errors thrown by the use case', async () => {
            const error = new Error('docker daemon unreachable');
            mockPruneImagesUseCase.mockRejectedValue(error);

            await expect(sut.pruneImages()).rejects.toThrow(error);
        });
    });

    describe('pruneVolumes', () => {
        it('delegates to the prune volumes use case with the pruner repository', async () => {
            mockPruneVolumesUseCase.mockResolvedValue(volumesResult);

            await sut.pruneVolumes();

            expect(mockPruneVolumesUseCase).toHaveBeenCalledTimes(1);
            expect(mockPruneVolumesUseCase).toHaveBeenCalledWith(mockPruner);
        });

        it('returns the prune result produced by the use case', async () => {
            mockPruneVolumesUseCase.mockResolvedValue(volumesResult);

            const result = await sut.pruneVolumes();

            expect(result).toBe(volumesResult);
        });

        it('returns a zeroed result when nothing was reclaimed', async () => {
            mockPruneVolumesUseCase.mockResolvedValue(emptyResult);

            const result = await sut.pruneVolumes();

            expect(result).toEqual({ deletedCount: 0, spaceReclaimed: 0 });
        });

        it('never touches the other prune use cases', async () => {
            mockPruneVolumesUseCase.mockResolvedValue(volumesResult);

            await sut.pruneVolumes();

            expect(mockPruneImagesUseCase).not.toHaveBeenCalled();
            expect(mockPruneContainersUseCase).not.toHaveBeenCalled();
        });

        it('propagates errors thrown by the use case', async () => {
            const error = new Error('docker daemon unreachable');
            mockPruneVolumesUseCase.mockRejectedValue(error);

            await expect(sut.pruneVolumes()).rejects.toThrow(error);
        });
    });

    describe('pruneContainers', () => {
        it('delegates to the prune containers use case with the pruner repository', async () => {
            mockPruneContainersUseCase.mockResolvedValue(containersResult);

            await sut.pruneContainers();

            expect(mockPruneContainersUseCase).toHaveBeenCalledTimes(1);
            expect(mockPruneContainersUseCase).toHaveBeenCalledWith(mockPruner);
        });

        it('returns the prune result produced by the use case', async () => {
            mockPruneContainersUseCase.mockResolvedValue(containersResult);

            const result = await sut.pruneContainers();

            expect(result).toBe(containersResult);
        });

        it('returns a zeroed result when nothing was reclaimed', async () => {
            mockPruneContainersUseCase.mockResolvedValue(emptyResult);

            const result = await sut.pruneContainers();

            expect(result).toEqual({ deletedCount: 0, spaceReclaimed: 0 });
        });

        it('never touches the other prune use cases', async () => {
            mockPruneContainersUseCase.mockResolvedValue(containersResult);

            await sut.pruneContainers();

            expect(mockPruneImagesUseCase).not.toHaveBeenCalled();
            expect(mockPruneVolumesUseCase).not.toHaveBeenCalled();
        });

        it('propagates errors thrown by the use case', async () => {
            const error = new Error('docker daemon unreachable');
            mockPruneContainersUseCase.mockRejectedValue(error);

            await expect(sut.pruneContainers()).rejects.toThrow(error);
        });
    });

    describe('removeOrphanedContainers', () => {
        it('delegates to the remove orphaned containers use case with its dependencies', async () => {
            mockRemoveOrphanedContainersUseCase.mockResolvedValue(orphanResult);

            await sut.removeOrphanedContainers();

            expect(mockRemoveOrphanedContainersUseCase).toHaveBeenCalledTimes(1);
            expect(mockRemoveOrphanedContainersUseCase).toHaveBeenCalledWith(mockOrphanContainers, mockServices);
        });

        it('returns the orphan removal result produced by the use case', async () => {
            mockRemoveOrphanedContainersUseCase.mockResolvedValue(orphanResult);

            const result = await sut.removeOrphanedContainers();

            expect(result).toBe(orphanResult);
        });

        it('returns an empty result when there is nothing to remove', async () => {
            mockRemoveOrphanedContainersUseCase.mockResolvedValue({ removed: 0, names: [] });

            const result = await sut.removeOrphanedContainers();

            expect(result).toEqual({ removed: 0, names: [] });
        });

        it('never touches the prune use cases', async () => {
            mockRemoveOrphanedContainersUseCase.mockResolvedValue(orphanResult);

            await sut.removeOrphanedContainers();

            expect(mockPruneImagesUseCase).not.toHaveBeenCalled();
            expect(mockPruneVolumesUseCase).not.toHaveBeenCalled();
            expect(mockPruneContainersUseCase).not.toHaveBeenCalled();
        });

        it('propagates errors thrown by the use case', async () => {
            const error = new Error('docker daemon unreachable');
            mockRemoveOrphanedContainersUseCase.mockRejectedValue(error);

            await expect(sut.removeOrphanedContainers()).rejects.toThrow(error);
        });
    });

    describe('checkReadiness', () => {
        it('delegates to the check readiness use case with both probes in order', async () => {
            mockCheckReadinessUseCase.mockResolvedValue(readinessResult);

            await sut.checkReadiness();

            expect(mockCheckReadinessUseCase).toHaveBeenCalledTimes(1);
            expect(mockCheckReadinessUseCase).toHaveBeenCalledWith([
                mockPostgresProbe,
                mockDockerProbe,
            ]);
        });

        it('returns the aggregated readiness result produced by the use case', async () => {
            mockCheckReadinessUseCase.mockResolvedValue(readinessResult);

            const result = await sut.checkReadiness();

            expect(result).toBe(readinessResult);
        });

        it('returns an error aggregate when the use case reports a dependency down', async () => {
            const errored: ReadinessResult = {
                status: 'error',
                dependencies: [
                    { name: 'postgres', status: 'up' },
                    { name: 'docker', status: 'down' },
                ],
            };
            mockCheckReadinessUseCase.mockResolvedValue(errored);

            const result = await sut.checkReadiness();

            expect(result).toEqual(errored);
        });

        it('propagates errors thrown by the use case', async () => {
            const error = new Error('unexpected');
            mockCheckReadinessUseCase.mockRejectedValue(error);

            await expect(sut.checkReadiness()).rejects.toThrow(error);
        });
    });

    describe('getStatus', () => {
        it('delegates to the get server status use case with the container runtime', async () => {
            mockGetServerStatusUseCase.mockResolvedValue(runtimeInfo);

            await sut.getStatus();

            expect(mockGetServerStatusUseCase).toHaveBeenCalledTimes(1);
            expect(mockGetServerStatusUseCase).toHaveBeenCalledWith(mockContainerRuntime);
        });

        it('returns the container runtime info produced by the use case', async () => {
            mockGetServerStatusUseCase.mockResolvedValue(runtimeInfo);

            const result = await sut.getStatus();

            expect(result).toEqual({
                serverVersion: '27.1.1',
                operatingSystem: 'Ubuntu 24.04',
                containers: 4,
                images: 12,
            });
        });

        it('propagates errors thrown by the use case', async () => {
            const error = new Error('docker daemon unreachable');
            mockGetServerStatusUseCase.mockRejectedValue(error);

            await expect(sut.getStatus()).rejects.toThrow(error);
        });
    });

    describe('getSettings', () => {
        it('delegates to the get platform settings use case with the settings repository', async () => {
            mockGetPlatformSettingsUseCase.mockResolvedValue(platformSettings);

            await sut.getSettings();

            expect(mockGetPlatformSettingsUseCase).toHaveBeenCalledTimes(1);
            expect(mockGetPlatformSettingsUseCase).toHaveBeenCalledWith(mockPlatformSettings);
        });

        it('returns the parameters produced by the use case', async () => {
            mockGetPlatformSettingsUseCase.mockResolvedValue(platformSettings);

            expect(await sut.getSettings()).toBe(platformSettings);
        });

        it('propagates errors thrown by the use case', async () => {
            const error = new Error('connection terminated');
            mockGetPlatformSettingsUseCase.mockRejectedValue(error);

            await expect(sut.getSettings()).rejects.toThrow(error);
        });
    });

    describe('updateSettings', () => {
        it('delegates to the update platform settings use case with the repository and the body', async () => {
            mockUpdatePlatformSettingsUseCase.mockResolvedValue(platformSettings);

            await sut.updateSettings({ logRetentionDays: 45 });

            expect(mockUpdatePlatformSettingsUseCase).toHaveBeenCalledTimes(1);
            expect(mockUpdatePlatformSettingsUseCase)
                .toHaveBeenCalledWith(mockPlatformSettings, { logRetentionDays: 45 });
        });

        it('returns the parameters produced by the use case', async () => {
            mockUpdatePlatformSettingsUseCase.mockResolvedValue(platformSettings);

            expect(await sut.updateSettings({ logRetentionDays: 45 })).toBe(platformSettings);
        });

        it('propagates errors thrown by the use case', async () => {
            const error = new InvalidLogRetentionError();
            mockUpdatePlatformSettingsUseCase.mockRejectedValue(error);

            await expect(sut.updateSettings({ logRetentionDays: 0 })).rejects.toThrow(error);
        });
    });
});
