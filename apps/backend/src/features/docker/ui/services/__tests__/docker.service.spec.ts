import { Test } from '@nestjs/testing';

import { listHostContainersUseCase } from '../../../application/list-host-containers.use-case';
import { listHostImagesUseCase } from '../../../application/list-host-images.use-case';
import { listHostNetworksUseCase } from '../../../application/list-host-networks.use-case';
import { listHostVolumesUseCase } from '../../../application/list-host-volumes.use-case';
import { DockerService } from '../docker.service';

import type {
    RuntimeContainerSummary,
    RuntimeImageSummary,
    RuntimeNetworkSummary,
    RuntimeVolumeSummary,
} from '@core/domain/models/container-runtime.models';
import { DockerContainerRuntimeAdapter } from '@core/infrastructure/docker/docker-container-runtime.adapter';

jest.mock('../../../application/list-host-containers.use-case');
jest.mock('../../../application/list-host-images.use-case');
jest.mock('../../../application/list-host-networks.use-case');
jest.mock('../../../application/list-host-volumes.use-case');

const mockListHostContainersUseCase = listHostContainersUseCase as jest.MockedFunction<typeof listHostContainersUseCase>;
const mockListHostImagesUseCase = listHostImagesUseCase as jest.MockedFunction<typeof listHostImagesUseCase>;
const mockListHostVolumesUseCase = listHostVolumesUseCase as jest.MockedFunction<typeof listHostVolumesUseCase>;
const mockListHostNetworksUseCase = listHostNetworksUseCase as jest.MockedFunction<typeof listHostNetworksUseCase>;

const containers: RuntimeContainerSummary[] = [
    {
        id: 'a1b2c3d4e5f6',
        names: ['gitpaas-backend'],
        image: 'gitpaas/backend:latest',
        state: 'running',
        status: 'Up 3 minutes',
        createdAt: new Date('2026-07-11T00:00:00.000Z'),
        projects: [],
        serviceId: null,
        ephemeral: false,
        ports: [],
        networks: ['gitpaas'],
        mounts: [],
    },
];

const images: RuntimeImageSummary[] = [
    {
        id: 'sha256:1111', tags: ['nginx:latest'], size: 142_000_000, createdAt: new Date('2026-07-11T00:00:00.000Z'),
    },
];

const volumes: RuntimeVolumeSummary[] = [
    {
        name: 'gitpaas_postgres',
        driver: 'local',
        mountpoint: '/var/lib/docker/volumes/gitpaas_postgres/_data',
        scope: 'local',
        labels: {},
        createdAt: new Date('2026-07-11T00:00:00.000Z'),
    },
];

const networks: RuntimeNetworkSummary[] = [
    {
        id: 'net-1',
        name: 'gitpaas',
        driver: 'bridge',
        scope: 'local',
        internal: false,
        attachable: true,
        createdAt: new Date('2026-07-11T00:00:00.000Z'),
        labels: {},
    },
];

describe('DockerService', () => {
    let mockContainerRuntime: jest.Mocked<DockerContainerRuntimeAdapter>;
    let sut: DockerService;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockContainerRuntime = {} as jest.Mocked<DockerContainerRuntimeAdapter>;

        const moduleRef = await Test.createTestingModule({
            providers: [DockerService, { provide: DockerContainerRuntimeAdapter, useValue: mockContainerRuntime }],
        }).compile();

        sut = moduleRef.get(DockerService);
    });

    describe('listContainers', () => {
        it('delegates to the use case with the runtime of the containers', async () => {
            mockListHostContainersUseCase.mockResolvedValue(containers);

            await sut.listContainers();

            expect(mockListHostContainersUseCase).toHaveBeenCalledTimes(1);
            expect(mockListHostContainersUseCase).toHaveBeenCalledWith(mockContainerRuntime);
        });

        it('returns the containers produced by the use case', async () => {
            mockListHostContainersUseCase.mockResolvedValue(containers);

            expect(await sut.listContainers()).toBe(containers);
        });

        it('propagates the error raised by the use case', async () => {
            const error = new Error('daemon unreachable');
            mockListHostContainersUseCase.mockRejectedValue(error);

            await expect(sut.listContainers()).rejects.toThrow(error);
        });
    });

    describe('listImages', () => {
        it('delegates to the use case with the runtime of the containers', async () => {
            mockListHostImagesUseCase.mockResolvedValue(images);

            await sut.listImages();

            expect(mockListHostImagesUseCase).toHaveBeenCalledTimes(1);
            expect(mockListHostImagesUseCase).toHaveBeenCalledWith(mockContainerRuntime);
        });

        it('returns the images produced by the use case', async () => {
            mockListHostImagesUseCase.mockResolvedValue(images);

            expect(await sut.listImages()).toBe(images);
        });

        it('propagates the error raised by the use case', async () => {
            const error = new Error('daemon unreachable');
            mockListHostImagesUseCase.mockRejectedValue(error);

            await expect(sut.listImages()).rejects.toThrow(error);
        });
    });

    describe('listVolumes', () => {
        it('delegates to the use case with the runtime of the containers', async () => {
            mockListHostVolumesUseCase.mockResolvedValue(volumes);

            await sut.listVolumes();

            expect(mockListHostVolumesUseCase).toHaveBeenCalledTimes(1);
            expect(mockListHostVolumesUseCase).toHaveBeenCalledWith(mockContainerRuntime);
        });

        it('returns the volumes produced by the use case', async () => {
            mockListHostVolumesUseCase.mockResolvedValue(volumes);

            expect(await sut.listVolumes()).toBe(volumes);
        });

        it('propagates the error raised by the use case', async () => {
            const error = new Error('daemon unreachable');
            mockListHostVolumesUseCase.mockRejectedValue(error);

            await expect(sut.listVolumes()).rejects.toThrow(error);
        });
    });

    describe('listNetworks', () => {
        it('delegates to the use case with the runtime of the containers', async () => {
            mockListHostNetworksUseCase.mockResolvedValue(networks);

            await sut.listNetworks();

            expect(mockListHostNetworksUseCase).toHaveBeenCalledTimes(1);
            expect(mockListHostNetworksUseCase).toHaveBeenCalledWith(mockContainerRuntime);
        });

        it('returns the networks produced by the use case', async () => {
            mockListHostNetworksUseCase.mockResolvedValue(networks);

            expect(await sut.listNetworks()).toBe(networks);
        });

        it('propagates the error raised by the use case', async () => {
            const error = new Error('daemon unreachable');
            mockListHostNetworksUseCase.mockRejectedValue(error);

            await expect(sut.listNetworks()).rejects.toThrow(error);
        });
    });
});
