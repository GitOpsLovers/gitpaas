import { ForbiddenException, ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { DockerService } from '../../services/docker.service';
import { DockerController } from '../docker.controller';

import { DaemonUnreachableError } from '@core/domain/errors/container-runtime.errors';
import type {
    RuntimeContainerSummary,
    RuntimeImageSummary,
    RuntimeNetworkSummary,
    RuntimeVolumeSummary,
} from '@core/domain/models/container-runtime.models';

const containers: RuntimeContainerSummary[] = [
    {
        id: 'a1b2c3d4e5f6',
        names: ['gitpaas-backend'],
        image: 'gitpaas/backend:latest',
        state: 'exited',
        status: 'Exited (0) 2 hours ago',
        createdAt: new Date('2026-07-11T10:20:30.000Z'),
        projects: ['gitpaas'],
        serviceId: null,
        ephemeral: false,
        ports: [{ privatePort: 3000, publicPort: 8080, type: 'tcp' }],
        networks: ['gitpaas'],
        mounts: [],
    },
];

const images: RuntimeImageSummary[] = [
    {
        id: 'sha256:1111',
        tags: ['nginx:latest'],
        size: 142_000_000,
        createdAt: new Date('2026-07-11T10:20:30.000Z'),
    },
];

const volumes: RuntimeVolumeSummary[] = [
    {
        name: 'gitpaas_postgres',
        driver: 'local',
        mountpoint: '/var/lib/docker/volumes/gitpaas_postgres/_data',
        scope: 'local',
        labels: {},
        createdAt: null,
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
        createdAt: new Date('2026-07-11T10:20:30.000Z'),
        labels: {},
    },
];

describe('DockerController', () => {
    let mockDockerService: jest.Mocked<Pick<DockerService, 'listContainers' | 'listImages' | 'listVolumes' | 'listNetworks'>>;
    let sut: DockerController;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockDockerService = {
            listContainers: jest.fn(),
            listImages: jest.fn(),
            listVolumes: jest.fn(),
            listNetworks: jest.fn(),
        };

        const moduleRef = await Test.createTestingModule({
            controllers: [DockerController],
            providers: [{ provide: DockerService, useValue: mockDockerService }],
        }).compile();

        sut = moduleRef.get(DockerController);
    });

    describe('listContainers', () => {
        it('delegates to the service', async () => {
            mockDockerService.listContainers.mockResolvedValue(containers);

            await sut.listContainers();

            expect(mockDockerService.listContainers).toHaveBeenCalledTimes(1);
            expect(mockDockerService.listContainers).toHaveBeenCalledWith();
        });

        it('returns the containers of the host on the wire', async () => {
            mockDockerService.listContainers.mockResolvedValue(containers);

            expect(await sut.listContainers()).toEqual([
                {
                    id: 'a1b2c3d4e5f6',
                    names: ['gitpaas-backend'],
                    image: 'gitpaas/backend:latest',
                    state: 'exited',
                    status: 'Exited (0) 2 hours ago',
                    createdAt: '2026-07-11T10:20:30.000Z',
                    ports: [{ privatePort: 3000, publicPort: 8080, type: 'tcp' }],
                    networks: ['gitpaas'],
                    mounts: [],
                },
            ]);
        });

        it('returns an empty list when the host runs no container', async () => {
            mockDockerService.listContainers.mockResolvedValue([]);

            expect(await sut.listContainers()).toEqual([]);
        });

        it('translates a failure of the daemon into a ServiceUnavailableException', async () => {
            mockDockerService.listContainers.mockRejectedValue(new DaemonUnreachableError());

            await expect(sut.listContainers()).rejects.toBeInstanceOf(ServiceUnavailableException);
        });

        it('answers that failure of the daemon with a 503', async () => {
            mockDockerService.listContainers.mockRejectedValue(new DaemonUnreachableError());

            const error = await sut.listContainers().catch((caught: unknown) => caught);

            expect((error as ServiceUnavailableException).getStatus()).toBe(503);
        });

        it('includes remediation guidance in the message of that exception', async () => {
            mockDockerService.listContainers.mockRejectedValue(new DaemonUnreachableError());

            await expect(sut.listContainers()).rejects.toThrow(/Could not reach the server Docker daemon/);
        });

        it('chains the failure of the daemon as the cause, so the envelope carries its code', async () => {
            const daemonFailure = new DaemonUnreachableError({ cause: new Error('ECONNREFUSED') });
            mockDockerService.listContainers.mockRejectedValue(daemonFailure);

            const error = await sut.listContainers().catch((caught: unknown) => caught);

            expect((error as Error).cause).toBe(daemonFailure);
            expect(((error as Error).cause as DaemonUnreachableError).code).toBe('DAEMON_UNREACHABLE');
        });

        it('rethrows any other HttpException raised by the service unchanged', async () => {
            const original = new ForbiddenException('nope');
            mockDockerService.listContainers.mockRejectedValue(original);

            await expect(sut.listContainers()).rejects.toBe(original);
        });

        it('rethrows a failure that is not a failure of the daemon unchanged', async () => {
            const original = new Error('boom');
            mockDockerService.listContainers.mockRejectedValue(original);

            await expect(sut.listContainers()).rejects.toBe(original);
        });
    });

    describe('listImages', () => {
        it('delegates to the service', async () => {
            mockDockerService.listImages.mockResolvedValue(images);

            await sut.listImages();

            expect(mockDockerService.listImages).toHaveBeenCalledTimes(1);
            expect(mockDockerService.listImages).toHaveBeenCalledWith();
        });

        it('returns the images of the host on the wire', async () => {
            mockDockerService.listImages.mockResolvedValue(images);

            expect(await sut.listImages()).toEqual([
                {
                    id: 'sha256:1111',
                    tags: ['nginx:latest'],
                    size: 142_000_000,
                    createdAt: '2026-07-11T10:20:30.000Z',
                },
            ]);
        });

        it('returns an empty list when the host holds no image', async () => {
            mockDockerService.listImages.mockResolvedValue([]);

            expect(await sut.listImages()).toEqual([]);
        });

        it('translates a failure of the daemon into a 503', async () => {
            mockDockerService.listImages.mockRejectedValue(new DaemonUnreachableError());

            await expect(sut.listImages()).rejects.toBeInstanceOf(ServiceUnavailableException);
        });

        it('rethrows a failure that is not a failure of the daemon unchanged', async () => {
            const original = new Error('boom');
            mockDockerService.listImages.mockRejectedValue(original);

            await expect(sut.listImages()).rejects.toBe(original);
        });
    });

    describe('listVolumes', () => {
        it('delegates to the service', async () => {
            mockDockerService.listVolumes.mockResolvedValue(volumes);

            await sut.listVolumes();

            expect(mockDockerService.listVolumes).toHaveBeenCalledTimes(1);
            expect(mockDockerService.listVolumes).toHaveBeenCalledWith();
        });

        it('returns the volumes of the host on the wire, with a null date when the daemon reported none', async () => {
            mockDockerService.listVolumes.mockResolvedValue(volumes);

            expect(await sut.listVolumes()).toEqual([
                {
                    name: 'gitpaas_postgres',
                    driver: 'local',
                    mountpoint: '/var/lib/docker/volumes/gitpaas_postgres/_data',
                    scope: 'local',
                    labels: {},
                    createdAt: null,
                },
            ]);
        });

        it('returns an empty list when the host holds no volume', async () => {
            mockDockerService.listVolumes.mockResolvedValue([]);

            expect(await sut.listVolumes()).toEqual([]);
        });

        it('translates a failure of the daemon into a 503', async () => {
            mockDockerService.listVolumes.mockRejectedValue(new DaemonUnreachableError());

            await expect(sut.listVolumes()).rejects.toBeInstanceOf(ServiceUnavailableException);
        });

        it('rethrows a failure that is not a failure of the daemon unchanged', async () => {
            const original = new Error('boom');
            mockDockerService.listVolumes.mockRejectedValue(original);

            await expect(sut.listVolumes()).rejects.toBe(original);
        });
    });

    describe('listNetworks', () => {
        it('delegates to the service', async () => {
            mockDockerService.listNetworks.mockResolvedValue(networks);

            await sut.listNetworks();

            expect(mockDockerService.listNetworks).toHaveBeenCalledTimes(1);
            expect(mockDockerService.listNetworks).toHaveBeenCalledWith();
        });

        it('returns the networks of the host on the wire', async () => {
            mockDockerService.listNetworks.mockResolvedValue(networks);

            expect(await sut.listNetworks()).toEqual([
                {
                    id: 'net-1',
                    name: 'gitpaas',
                    driver: 'bridge',
                    scope: 'local',
                    internal: false,
                    attachable: true,
                    createdAt: '2026-07-11T10:20:30.000Z',
                    labels: {},
                },
            ]);
        });

        it('returns an empty list when the host holds no network', async () => {
            mockDockerService.listNetworks.mockResolvedValue([]);

            expect(await sut.listNetworks()).toEqual([]);
        });

        it('translates a failure of the daemon into a 503', async () => {
            mockDockerService.listNetworks.mockRejectedValue(new DaemonUnreachableError());

            await expect(sut.listNetworks()).rejects.toBeInstanceOf(ServiceUnavailableException);
        });

        it('rethrows a failure that is not a failure of the daemon unchanged', async () => {
            const original = new Error('boom');
            mockDockerService.listNetworks.mockRejectedValue(original);

            await expect(sut.listNetworks()).rejects.toBe(original);
        });
    });
});
