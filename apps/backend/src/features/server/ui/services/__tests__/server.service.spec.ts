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

const checkReadinessUseCaseMock = checkReadinessUseCase as jest.MockedFunction<
    typeof checkReadinessUseCase
>;
const pruneImagesUseCaseMock = pruneImagesUseCase as jest.MockedFunction<typeof pruneImagesUseCase>;
const pruneVolumesUseCaseMock = pruneVolumesUseCase as jest.MockedFunction<
    typeof pruneVolumesUseCase
>;
const pruneContainersUseCaseMock = pruneContainersUseCase as jest.MockedFunction<
    typeof pruneContainersUseCase
>;
const removeOrphanedContainersUseCaseMock = removeOrphanedContainersUseCase as jest.MockedFunction<
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
    let pruner: jest.Mocked<DockerServerPrunerRepository>;
    let orphanContainers: jest.Mocked<DockerOrphanContainersRepository>;
    let services: jest.Mocked<ServicesDatabaseRepository>;
    let postgresProbe: jest.Mocked<PostgresHealthProbe>;
    let redisProbe: jest.Mocked<RedisHealthProbe>;
    let dockerProbe: jest.Mocked<DockerHealthProbe>;
    let sut: ServerService;

    beforeEach(async () => {
        jest.clearAllMocks();

        pruner = {} as jest.Mocked<DockerServerPrunerRepository>;
        orphanContainers = {} as jest.Mocked<DockerOrphanContainersRepository>;
        services = {} as jest.Mocked<ServicesDatabaseRepository>;
        postgresProbe = { name: 'postgres', check: jest.fn() } as jest.Mocked<PostgresHealthProbe>;
        redisProbe = { name: 'redis', check: jest.fn() } as jest.Mocked<RedisHealthProbe>;
        dockerProbe = { name: 'docker', check: jest.fn() } as jest.Mocked<DockerHealthProbe>;

        const moduleRef = await Test.createTestingModule({
            providers: [
                ServerService,
                { provide: DockerServerPrunerRepository, useValue: pruner },
                { provide: DockerOrphanContainersRepository, useValue: orphanContainers },
                { provide: ServicesDatabaseRepository, useValue: services },
                { provide: PostgresHealthProbe, useValue: postgresProbe },
                { provide: RedisHealthProbe, useValue: redisProbe },
                { provide: DockerHealthProbe, useValue: dockerProbe },
            ],
        }).compile();

        sut = moduleRef.get(ServerService);
    });

    describe('pruneImages', () => {
        it('delegates to the prune images use case with the pruner repository', async () => {
            pruneImagesUseCaseMock.mockResolvedValue(imagesResult);

            await sut.pruneImages();

            expect(pruneImagesUseCaseMock).toHaveBeenCalledTimes(1);
            expect(pruneImagesUseCaseMock).toHaveBeenCalledWith(pruner);
        });

        it('returns the prune result produced by the use case', async () => {
            pruneImagesUseCaseMock.mockResolvedValue(imagesResult);

            const result = await sut.pruneImages();

            expect(result).toBe(imagesResult);
        });

        it('returns a zeroed result when nothing was reclaimed', async () => {
            pruneImagesUseCaseMock.mockResolvedValue(emptyResult);

            const result = await sut.pruneImages();

            expect(result).toEqual({ deletedCount: 0, spaceReclaimed: 0 });
        });

        it('never touches the other prune use cases', async () => {
            pruneImagesUseCaseMock.mockResolvedValue(imagesResult);

            await sut.pruneImages();

            expect(pruneVolumesUseCaseMock).not.toHaveBeenCalled();
            expect(pruneContainersUseCaseMock).not.toHaveBeenCalled();
        });

        it('propagates errors thrown by the use case', async () => {
            const error = new Error('docker daemon unreachable');
            pruneImagesUseCaseMock.mockRejectedValue(error);

            await expect(sut.pruneImages()).rejects.toThrow(error);
        });
    });

    describe('pruneVolumes', () => {
        it('delegates to the prune volumes use case with the pruner repository', async () => {
            pruneVolumesUseCaseMock.mockResolvedValue(volumesResult);

            await sut.pruneVolumes();

            expect(pruneVolumesUseCaseMock).toHaveBeenCalledTimes(1);
            expect(pruneVolumesUseCaseMock).toHaveBeenCalledWith(pruner);
        });

        it('returns the prune result produced by the use case', async () => {
            pruneVolumesUseCaseMock.mockResolvedValue(volumesResult);

            const result = await sut.pruneVolumes();

            expect(result).toBe(volumesResult);
        });

        it('returns a zeroed result when nothing was reclaimed', async () => {
            pruneVolumesUseCaseMock.mockResolvedValue(emptyResult);

            const result = await sut.pruneVolumes();

            expect(result).toEqual({ deletedCount: 0, spaceReclaimed: 0 });
        });

        it('never touches the other prune use cases', async () => {
            pruneVolumesUseCaseMock.mockResolvedValue(volumesResult);

            await sut.pruneVolumes();

            expect(pruneImagesUseCaseMock).not.toHaveBeenCalled();
            expect(pruneContainersUseCaseMock).not.toHaveBeenCalled();
        });

        it('propagates errors thrown by the use case', async () => {
            const error = new Error('docker daemon unreachable');
            pruneVolumesUseCaseMock.mockRejectedValue(error);

            await expect(sut.pruneVolumes()).rejects.toThrow(error);
        });
    });

    describe('pruneContainers', () => {
        it('delegates to the prune containers use case with the pruner repository', async () => {
            pruneContainersUseCaseMock.mockResolvedValue(containersResult);

            await sut.pruneContainers();

            expect(pruneContainersUseCaseMock).toHaveBeenCalledTimes(1);
            expect(pruneContainersUseCaseMock).toHaveBeenCalledWith(pruner);
        });

        it('returns the prune result produced by the use case', async () => {
            pruneContainersUseCaseMock.mockResolvedValue(containersResult);

            const result = await sut.pruneContainers();

            expect(result).toBe(containersResult);
        });

        it('returns a zeroed result when nothing was reclaimed', async () => {
            pruneContainersUseCaseMock.mockResolvedValue(emptyResult);

            const result = await sut.pruneContainers();

            expect(result).toEqual({ deletedCount: 0, spaceReclaimed: 0 });
        });

        it('never touches the other prune use cases', async () => {
            pruneContainersUseCaseMock.mockResolvedValue(containersResult);

            await sut.pruneContainers();

            expect(pruneImagesUseCaseMock).not.toHaveBeenCalled();
            expect(pruneVolumesUseCaseMock).not.toHaveBeenCalled();
        });

        it('propagates errors thrown by the use case', async () => {
            const error = new Error('docker daemon unreachable');
            pruneContainersUseCaseMock.mockRejectedValue(error);

            await expect(sut.pruneContainers()).rejects.toThrow(error);
        });
    });

    describe('removeOrphanedContainers', () => {
        it('delegates to the remove orphaned containers use case with its dependencies', async () => {
            removeOrphanedContainersUseCaseMock.mockResolvedValue(orphanResult);

            await sut.removeOrphanedContainers();

            expect(removeOrphanedContainersUseCaseMock).toHaveBeenCalledTimes(1);
            expect(removeOrphanedContainersUseCaseMock).toHaveBeenCalledWith(orphanContainers, services);
        });

        it('returns the orphan removal result produced by the use case', async () => {
            removeOrphanedContainersUseCaseMock.mockResolvedValue(orphanResult);

            const result = await sut.removeOrphanedContainers();

            expect(result).toBe(orphanResult);
        });

        it('returns an empty result when there is nothing to remove', async () => {
            removeOrphanedContainersUseCaseMock.mockResolvedValue({ removed: 0, names: [] });

            const result = await sut.removeOrphanedContainers();

            expect(result).toEqual({ removed: 0, names: [] });
        });

        it('never touches the prune use cases', async () => {
            removeOrphanedContainersUseCaseMock.mockResolvedValue(orphanResult);

            await sut.removeOrphanedContainers();

            expect(pruneImagesUseCaseMock).not.toHaveBeenCalled();
            expect(pruneVolumesUseCaseMock).not.toHaveBeenCalled();
            expect(pruneContainersUseCaseMock).not.toHaveBeenCalled();
        });

        it('propagates errors thrown by the use case', async () => {
            const error = new Error('docker daemon unreachable');
            removeOrphanedContainersUseCaseMock.mockRejectedValue(error);

            await expect(sut.removeOrphanedContainers()).rejects.toThrow(error);
        });
    });

    describe('checkReadiness', () => {
        it('delegates to the check readiness use case with the three probes in order', async () => {
            checkReadinessUseCaseMock.mockResolvedValue(readinessResult);

            await sut.checkReadiness();

            expect(checkReadinessUseCaseMock).toHaveBeenCalledTimes(1);
            expect(checkReadinessUseCaseMock).toHaveBeenCalledWith([
                postgresProbe,
                redisProbe,
                dockerProbe,
            ]);
        });

        it('returns the aggregated readiness result produced by the use case', async () => {
            checkReadinessUseCaseMock.mockResolvedValue(readinessResult);

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
            checkReadinessUseCaseMock.mockResolvedValue(errored);

            const result = await sut.checkReadiness();

            expect(result).toEqual(errored);
        });

        it('propagates errors thrown by the use case', async () => {
            const error = new Error('unexpected');
            checkReadinessUseCaseMock.mockRejectedValue(error);

            await expect(sut.checkReadiness()).rejects.toThrow(error);
        });
    });
});
