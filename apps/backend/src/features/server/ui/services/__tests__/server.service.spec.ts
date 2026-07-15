import { pruneContainersUseCase } from '../../../application/prune-containers.use-case';
import { pruneImagesUseCase } from '../../../application/prune-images.use-case';
import { pruneVolumesUseCase } from '../../../application/prune-volumes.use-case';
import { PruneResult } from '../../../domain/models/prune-result.model';
import { DockerServerPrunerRepository } from '../../../infrastructure/docker/docker-server-pruner.repository';
import { ServerService } from '../server.service';

jest.mock('../../../application/prune-images.use-case');
jest.mock('../../../application/prune-volumes.use-case');
jest.mock('../../../application/prune-containers.use-case');

const pruneImagesUseCaseMock = pruneImagesUseCase as jest.MockedFunction<typeof pruneImagesUseCase>;
const pruneVolumesUseCaseMock = pruneVolumesUseCase as jest.MockedFunction<
    typeof pruneVolumesUseCase
>;
const pruneContainersUseCaseMock = pruneContainersUseCase as jest.MockedFunction<
    typeof pruneContainersUseCase
>;

const imagesResult: PruneResult = { deletedCount: 3, spaceReclaimed: 1_048_576 };
const volumesResult: PruneResult = { deletedCount: 2, spaceReclaimed: 524_288 };
const containersResult: PruneResult = { deletedCount: 5, spaceReclaimed: 0 };
const emptyResult: PruneResult = { deletedCount: 0, spaceReclaimed: 0 };

describe('ServerService', () => {
    let pruner: jest.Mocked<DockerServerPrunerRepository>;
    let sut: ServerService;

    beforeEach(() => {
        jest.clearAllMocks();

        pruner = {} as jest.Mocked<DockerServerPrunerRepository>;

        sut = new ServerService(pruner);
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
});
