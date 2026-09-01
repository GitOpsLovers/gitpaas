import type { OrphanRemovalResult, PlatformSettings, PlatformUpdateStatus, PruneResult, ReadinessResult } from '@gitpaas/contracts';
import { Test } from '@nestjs/testing';

import { checkLatestReleaseUseCase } from '../../../application/check-latest-release.use-case';
import { checkReadinessUseCase } from '../../../application/check-readiness.use-case';
import { getPlatformSettingsUseCase } from '../../../application/get-platform-settings.use-case';
import { getPlatformUpdateUseCase } from '../../../application/get-platform-update.use-case';
import { getServerStatusUseCase } from '../../../application/get-server-status.use-case';
import { pruneContainersUseCase } from '../../../application/prune-containers.use-case';
import { pruneImagesUseCase } from '../../../application/prune-images.use-case';
import { pruneVolumesUseCase } from '../../../application/prune-volumes.use-case';
import { removeOrphanedContainersUseCase } from '../../../application/remove-orphaned-containers.use-case';
import { startPlatformUpdateUseCase } from '../../../application/start-platform-update.use-case';
import { updatePlatformSettingsUseCase } from '../../../application/update-platform-settings.use-case';
import { InvalidLogRetentionError, ReleaseSourceUnavailableError } from '../../../domain/errors/server.errors';
import { DatabasePlatformSettingsRepository } from '../../../infrastructure/database/db-platform-settings.repository';
import { DatabasePlatformUpdatesRepository } from '../../../infrastructure/database/db-platform-updates.repository';
import { DatabasePublicHostAddressAdapter } from '../../../infrastructure/database/db-public-host-address.adapter';
import { NodeDnsResolverAdapter } from '../../../infrastructure/dns/node-dns-resolver.adapter';
import { DockerOrphanContainersAdapter } from '../../../infrastructure/docker/docker-orphan-containers.adapter';
import { DockerServerPrunerAdapter } from '../../../infrastructure/docker/docker-server-pruner.adapter';
import { DockerUpdateRunnerAdapter } from '../../../infrastructure/docker/docker-update-runner.adapter';
import { FileControlPlaneEnvAdapter } from '../../../infrastructure/env/file-control-plane-env.adapter';
import { BackendHealthProbeAdapter } from '../../../infrastructure/health/backend-health-probe.adapter';
import { DockerHealthProbeAdapter } from '../../../infrastructure/health/docker-health-probe.adapter';
import { FrontendHealthProbeAdapter } from '../../../infrastructure/health/frontend-health-probe.adapter';
import { PostgresHealthProbeAdapter } from '../../../infrastructure/health/postgres-health-probe.adapter';
import { ProxyHealthProbeAdapter } from '../../../infrastructure/health/proxy-health-probe.adapter';
import { RedisHealthProbeAdapter } from '../../../infrastructure/health/redis-health-probe.adapter';
import { GithubReleaseSourceAdapter } from '../../../infrastructure/release/github-release-source.adapter';
import { MemoryLatestReleaseStoreAdapter } from '../../../infrastructure/release/memory-latest-release-store.adapter';
import { ServerService } from '../server.service';

import { ContainerRuntimeInfo } from '@core/domain/models/container-runtime.models';
import { DockerContainerRuntimeAdapter } from '@core/infrastructure/docker/docker-container-runtime.adapter';
import { resolveServiceVersion } from '@core/infrastructure/telemetry/resolve-service-version';
import { DatabaseServicesRepository } from '@features/services/infrastructure/database/db-services.repository';

jest.mock('../../../application/prune-images.use-case');
jest.mock('../../../application/prune-volumes.use-case');
jest.mock('../../../application/prune-containers.use-case');
jest.mock('../../../application/remove-orphaned-containers.use-case');
jest.mock('../../../application/check-readiness.use-case');
jest.mock('../../../application/check-latest-release.use-case');
jest.mock('../../../application/get-server-status.use-case');
jest.mock('../../../application/get-platform-settings.use-case');
jest.mock('../../../application/update-platform-settings.use-case');
jest.mock('../../../application/get-platform-update.use-case');
jest.mock('../../../application/start-platform-update.use-case');
jest.mock('@core/infrastructure/telemetry/resolve-service-version');

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
const mockGetPlatformUpdateUseCase = getPlatformUpdateUseCase as jest.MockedFunction<
    typeof getPlatformUpdateUseCase
>;
const mockStartPlatformUpdateUseCase = startPlatformUpdateUseCase as jest.MockedFunction<
    typeof startPlatformUpdateUseCase
>;
const mockCheckLatestReleaseUseCase = checkLatestReleaseUseCase as jest.MockedFunction<
    typeof checkLatestReleaseUseCase
>;
const mockResolveServiceVersion = resolveServiceVersion as jest.MockedFunction<typeof resolveServiceVersion>;

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
const updateStatus: PlatformUpdateStatus = {
    installedVersion: '2.1.0',
    latestVersion: '2.2.0',
    update: {
        id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
        targetVersion: 'v2.2.0',
        step: 'starting',
        percent: 0,
        state: 'running',
        error: null,
        startedAt: '2026-08-28T10:00:00.000Z',
    },
};
const readinessResult: ReadinessResult = {
    status: 'ok',
    dependencies: [
        { name: 'postgres', status: 'up' },
        { name: 'docker', status: 'up' },
        { name: 'redis', status: 'up' },
        { name: 'proxy', status: 'up' },
        { name: 'backend', status: 'up' },
        { name: 'frontend', status: 'up' },
    ],
};

describe('ServerService', () => {
    let mockPruner: jest.Mocked<DockerServerPrunerAdapter>;
    let mockOrphanContainers: jest.Mocked<DockerOrphanContainersAdapter>;
    let mockServices: jest.Mocked<DatabaseServicesRepository>;
    let mockPostgresProbe: jest.Mocked<PostgresHealthProbeAdapter>;
    let mockDockerProbe: jest.Mocked<DockerHealthProbeAdapter>;
    let mockRedisProbe: jest.Mocked<RedisHealthProbeAdapter>;
    let mockProxyProbe: jest.Mocked<ProxyHealthProbeAdapter>;
    let mockBackendProbe: jest.Mocked<BackendHealthProbeAdapter>;
    let mockFrontendProbe: jest.Mocked<FrontendHealthProbeAdapter>;
    let mockContainerRuntime: jest.Mocked<DockerContainerRuntimeAdapter>;
    let mockPlatformSettings: jest.Mocked<DatabasePlatformSettingsRepository>;
    let mockPlatformUpdates: jest.Mocked<DatabasePlatformUpdatesRepository>;
    let mockLatestReleaseStore: jest.Mocked<MemoryLatestReleaseStoreAdapter>;
    let mockReleaseSource: jest.Mocked<GithubReleaseSourceAdapter>;
    let mockUpdateRunner: jest.Mocked<DockerUpdateRunnerAdapter>;
    let mockDnsResolver: jest.Mocked<NodeDnsResolverAdapter>;
    let mockPublicHostAddress: jest.Mocked<DatabasePublicHostAddressAdapter>;
    let mockControlPlaneEnvFile: jest.Mocked<FileControlPlaneEnvAdapter>;
    let sut: ServerService;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockPruner = {} as jest.Mocked<DockerServerPrunerAdapter>;
        mockOrphanContainers = {} as jest.Mocked<DockerOrphanContainersAdapter>;
        mockServices = {} as jest.Mocked<DatabaseServicesRepository>;
        mockPostgresProbe = { name: 'postgres', check: jest.fn() } as unknown as jest.Mocked<PostgresHealthProbeAdapter>;
        mockDockerProbe = { name: 'docker', check: jest.fn() } as unknown as jest.Mocked<DockerHealthProbeAdapter>;
        mockRedisProbe = { name: 'redis', check: jest.fn() } as unknown as jest.Mocked<RedisHealthProbeAdapter>;
        mockProxyProbe = { name: 'proxy', check: jest.fn() } as unknown as jest.Mocked<ProxyHealthProbeAdapter>;
        mockBackendProbe = { name: 'backend', check: jest.fn() } as unknown as jest.Mocked<BackendHealthProbeAdapter>;
        mockFrontendProbe = { name: 'frontend', check: jest.fn() } as unknown as jest.Mocked<FrontendHealthProbeAdapter>;
        mockContainerRuntime = {} as jest.Mocked<DockerContainerRuntimeAdapter>;
        mockPlatformSettings = {} as jest.Mocked<DatabasePlatformSettingsRepository>;
        mockPlatformUpdates = {} as jest.Mocked<DatabasePlatformUpdatesRepository>;
        mockLatestReleaseStore = {} as jest.Mocked<MemoryLatestReleaseStoreAdapter>;
        mockReleaseSource = {} as jest.Mocked<GithubReleaseSourceAdapter>;
        mockUpdateRunner = {} as jest.Mocked<DockerUpdateRunnerAdapter>;
        mockDnsResolver = {} as jest.Mocked<NodeDnsResolverAdapter>;
        mockPublicHostAddress = {} as jest.Mocked<DatabasePublicHostAddressAdapter>;
        mockControlPlaneEnvFile = {} as jest.Mocked<FileControlPlaneEnvAdapter>;
        mockResolveServiceVersion.mockReturnValue('2.1.0');

        const moduleRef = await Test.createTestingModule({
            providers: [
                ServerService,
                { provide: DockerServerPrunerAdapter, useValue: mockPruner },
                { provide: DockerOrphanContainersAdapter, useValue: mockOrphanContainers },
                { provide: DatabaseServicesRepository, useValue: mockServices },
                { provide: PostgresHealthProbeAdapter, useValue: mockPostgresProbe },
                { provide: DockerHealthProbeAdapter, useValue: mockDockerProbe },
                { provide: RedisHealthProbeAdapter, useValue: mockRedisProbe },
                { provide: ProxyHealthProbeAdapter, useValue: mockProxyProbe },
                { provide: BackendHealthProbeAdapter, useValue: mockBackendProbe },
                { provide: FrontendHealthProbeAdapter, useValue: mockFrontendProbe },
                { provide: DockerContainerRuntimeAdapter, useValue: mockContainerRuntime },
                { provide: DatabasePlatformSettingsRepository, useValue: mockPlatformSettings },
                { provide: DatabasePlatformUpdatesRepository, useValue: mockPlatformUpdates },
                { provide: MemoryLatestReleaseStoreAdapter, useValue: mockLatestReleaseStore },
                { provide: GithubReleaseSourceAdapter, useValue: mockReleaseSource },
                { provide: DockerUpdateRunnerAdapter, useValue: mockUpdateRunner },
                { provide: NodeDnsResolverAdapter, useValue: mockDnsResolver },
                { provide: DatabasePublicHostAddressAdapter, useValue: mockPublicHostAddress },
                { provide: FileControlPlaneEnvAdapter, useValue: mockControlPlaneEnvFile },
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
        it('delegates to the check readiness use case with the six probes of the stack in order', async () => {
            mockCheckReadinessUseCase.mockResolvedValue(readinessResult);

            await sut.checkReadiness();

            expect(mockCheckReadinessUseCase).toHaveBeenCalledTimes(1);
            expect(mockCheckReadinessUseCase).toHaveBeenCalledWith([
                mockPostgresProbe,
                mockDockerProbe,
                mockRedisProbe,
                mockProxyProbe,
                mockBackendProbe,
                mockFrontendProbe,
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
                    { name: 'docker', status: 'up' },
                    { name: 'redis', status: 'down' },
                    { name: 'proxy', status: 'up' },
                    { name: 'backend', status: 'up' },
                    { name: 'frontend', status: 'up' },
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
        it('delegates to the update platform settings use case with the ports and the body', async () => {
            mockUpdatePlatformSettingsUseCase.mockResolvedValue(platformSettings);

            await sut.updateSettings({ logRetentionDays: 45 });

            expect(mockUpdatePlatformSettingsUseCase).toHaveBeenCalledTimes(1);
            expect(mockUpdatePlatformSettingsUseCase).toHaveBeenCalledWith(
                mockPlatformSettings,
                mockDnsResolver,
                mockPublicHostAddress,
                mockControlPlaneEnvFile,
                { logRetentionDays: 45 },
            );
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

    describe('getUpdate', () => {
        it('delegates to the get platform update use case with the repository, the store and the installed version', async () => {
            mockGetPlatformUpdateUseCase.mockResolvedValue(updateStatus);

            await sut.getUpdate();

            expect(mockGetPlatformUpdateUseCase).toHaveBeenCalledTimes(1);
            expect(mockGetPlatformUpdateUseCase).toHaveBeenCalledWith(mockPlatformUpdates, mockLatestReleaseStore, '2.1.0');
        });

        it('reads the installed version from the image that runs', async () => {
            mockGetPlatformUpdateUseCase.mockResolvedValue(updateStatus);
            mockResolveServiceVersion.mockReturnValue('9.9.9');

            await sut.getUpdate();

            expect(mockGetPlatformUpdateUseCase).toHaveBeenCalledWith(mockPlatformUpdates, mockLatestReleaseStore, '9.9.9');
        });

        it('returns the state produced by the use case', async () => {
            mockGetPlatformUpdateUseCase.mockResolvedValue(updateStatus);

            expect(await sut.getUpdate()).toBe(updateStatus);
        });

        it('propagates errors thrown by the use case', async () => {
            const error = new Error('connection terminated');
            mockGetPlatformUpdateUseCase.mockRejectedValue(error);

            await expect(sut.getUpdate()).rejects.toThrow(error);
        });
    });

    describe('checkUpdate', () => {
        it('delegates the check to the check latest release use case with the source and the store', async () => {
            mockCheckLatestReleaseUseCase.mockResolvedValue({ tag: 'v2.2.0', version: '2.2.0' });
            mockGetPlatformUpdateUseCase.mockResolvedValue(updateStatus);

            await sut.checkUpdate();

            expect(mockCheckLatestReleaseUseCase).toHaveBeenCalledTimes(1);
            expect(mockCheckLatestReleaseUseCase).toHaveBeenCalledWith(mockReleaseSource, mockLatestReleaseStore);
        });

        it('reads the state of the update once the check kept the release', async () => {
            mockCheckLatestReleaseUseCase.mockResolvedValue({ tag: 'v2.2.0', version: '2.2.0' });
            mockGetPlatformUpdateUseCase.mockResolvedValue(updateStatus);

            const result = await sut.checkUpdate();

            expect(mockGetPlatformUpdateUseCase).toHaveBeenCalledWith(mockPlatformUpdates, mockLatestReleaseStore, '2.1.0');
            expect(result).toBe(updateStatus);
        });

        it('reads the state of the update when the source publishes no release', async () => {
            mockCheckLatestReleaseUseCase.mockResolvedValue(null);
            mockGetPlatformUpdateUseCase.mockResolvedValue(updateStatus);

            expect(await sut.checkUpdate()).toBe(updateStatus);
        });

        it('propagates the failure of the source, and reads no state of the update', async () => {
            const error = new ReleaseSourceUnavailableError('GitHub answered 403');
            mockCheckLatestReleaseUseCase.mockRejectedValue(error);

            await expect(sut.checkUpdate()).rejects.toThrow(error);
            expect(mockGetPlatformUpdateUseCase).not.toHaveBeenCalled();
        });
    });

    describe('startUpdate', () => {
        it('delegates to the start platform update use case with the repository, the store, the runner and the version', async () => {
            mockStartPlatformUpdateUseCase.mockResolvedValue(updateStatus);

            await sut.startUpdate();

            expect(mockStartPlatformUpdateUseCase).toHaveBeenCalledTimes(1);
            expect(mockStartPlatformUpdateUseCase).toHaveBeenCalledWith(
                mockPlatformUpdates,
                mockLatestReleaseStore,
                mockUpdateRunner,
                '2.1.0',
            );
        });

        it('returns the state produced by the use case', async () => {
            mockStartPlatformUpdateUseCase.mockResolvedValue(updateStatus);

            expect(await sut.startUpdate()).toBe(updateStatus);
        });

        it('propagates errors thrown by the use case', async () => {
            const error = new Error('an update already runs');
            mockStartPlatformUpdateUseCase.mockRejectedValue(error);

            await expect(sut.startUpdate()).rejects.toThrow(error);
        });
    });
});
