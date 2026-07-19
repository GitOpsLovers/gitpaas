import { Test } from '@nestjs/testing';

import { checkReadinessUseCase } from '../../../application/check-readiness.use-case';
import { pruneContainersUseCase } from '../../../application/prune-containers.use-case';
import { pruneImagesUseCase } from '../../../application/prune-images.use-case';
import { pruneVolumesUseCase } from '../../../application/prune-volumes.use-case';
import { removeOrphanedContainersUseCase } from '../../../application/remove-orphaned-containers.use-case';
import { OrphanRemovalResult } from '../../../domain/models/orphan-removal-result.model';
import { PruneResult } from '../../../domain/models/prune-result.model';
import { ReadinessResult } from '../../../domain/models/readiness-result.model';
import { DockerOrphanContainersRepository } from '../../../infrastructure/docker/docker-orphan-containers.repository';
import { DockerServerPrunerRepository } from '../../../infrastructure/docker/docker-server-pruner.repository';
import { DockerHealthProbe } from '../../../infrastructure/health/docker-health-probe.repository';
import { PostgresHealthProbe } from '../../../infrastructure/health/postgres-health-probe.repository';
import { RedisHealthProbe } from '../../../infrastructure/health/redis-health-probe.repository';
import { ServerService } from '../server.service';

import { ServicesDatabaseRepository } from '@features/services/infrastructure/database/services-db.repository';

jest.mock('../../../application/prune-images.use-case');
jest.mock('../../../application/prune-volumes.use-case');
jest.mock('../../../application/prune-containers.use-case');
jest.mock('../../../application/remove-orphaned-containers.use-case');
jest.mock('../../../application/check-readiness.use-case');

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

const imagesResult: PruneResult = { deletedCount: 3, spaceReclaimed: 1_048_576 };
const volumesResult: PruneResult = { deletedCount: 2, spaceReclaimed: 524_288 };
const containersResult: PruneResult = { deletedCount: 5, spaceReclaimed: 0 };
const emptyResult: PruneResult = { deletedCount: 0, spaceReclaimed: 0 };
const orphanResult: OrphanRemovalResult = { removed: 2, names: ['stale-app-1', 'ghost-app-1'] };
const readinessResult: ReadinessResult = {
    status: 'ok',
    dependencies: [
        { name: 'postgres', status: 'up' },
        { name: 'redis', status: 'up' },
        { name: 'docker', status: 'up' },
    ],
};

describe('ServerService', () => {
    let mockPruner: jest.Mocked<DockerServerPrunerRepository>;
    let mockOrphanContainers: jest.Mocked<DockerOrphanContainersRepository>;
    let mockServices: jest.Mocked<ServicesDatabaseRepository>;
    let mockPostgresProbe: jest.Mocked<PostgresHealthProbe>;
    let mockRedisProbe: jest.Mocked<RedisHealthProbe>;
    let mockDockerProbe: jest.Mocked<DockerHealthProbe>;
    let sut: ServerService;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockPruner = {} as jest.Mocked<DockerServerPrunerRepository>;
        mockOrphanContainers = {} as jest.Mocked<DockerOrphanContainersRepository>;
        mockServices = {} as jest.Mocked<ServicesDatabaseRepository>;
        mockPostgresProbe = { name: 'postgres', check: jest.fn() } as unknown as jest.Mocked<PostgresHealthProbe>;
        mockRedisProbe = { name: 'redis', check: jest.fn() } as unknown as jest.Mocked<RedisHealthProbe>;
        mockDockerProbe = { name: 'docker', check: jest.fn() } as unknown as jest.Mocked<DockerHealthProbe>;

        const moduleRef = await Test.createTestingModule({
            providers: [
                ServerService,
                { provide: DockerServerPrunerRepository, useValue: mockPruner },
                { provide: DockerOrphanContainersRepository, useValue: mockOrphanContainers },
                { provide: ServicesDatabaseRepository, useValue: mockServices },
                { provide: PostgresHealthProbe, useValue: mockPostgresProbe },
                { provide: RedisHealthProbe, useValue: mockRedisProbe },
                { provide: DockerHealthProbe, useValue: mockDockerProbe },
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
        it('delegates to the check readiness use case with the three probes in order', async () => {
            mockCheckReadinessUseCase.mockResolvedValue(readinessResult);

            await sut.checkReadiness();

            expect(mockCheckReadinessUseCase).toHaveBeenCalledTimes(1);
            expect(mockCheckReadinessUseCase).toHaveBeenCalledWith([
                mockPostgresProbe,
                mockRedisProbe,
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
                    { name: 'redis', status: 'down' },
                    { name: 'docker', status: 'up' },
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
});
