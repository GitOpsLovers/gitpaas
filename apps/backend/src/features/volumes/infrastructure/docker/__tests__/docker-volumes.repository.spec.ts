import { DaemonVolume } from '../../../domain/models/daemon-volume.models';
import { DockerVolumesRepository } from '../docker-volumes.repository';

import { GITPAAS_MANAGED_LABEL, GITPAAS_MANAGED_VALUE, GITPAAS_SERVICE_LABEL } from '@core/domain/constants/gitpaas-labels.constants';
import type {
    RuntimeContainerMount,
    RuntimeContainerSummary,
    RuntimeVolumeSummary,
} from '@core/domain/models/container-runtime.models';
import { DockerContainerRuntimeAdapter } from '@core/infrastructure/docker/docker-container-runtime.adapter';
import { COMPOSE_PROJECT_LABEL } from '@core/infrastructure/docker/docker-container-runtime.transformer';
import { Service } from '@features/services/domain/models/service.models';

/** GitPaaS ownership marker every listing is scoped to. */
const managedLabels = { [GITPAAS_MANAGED_LABEL]: GITPAAS_MANAGED_VALUE };

/** Builds a runtime volume summary, overriding only the fields under test. */
const volumeSummary = (overrides: Partial<RuntimeVolumeSummary> = {}): RuntimeVolumeSummary => ({
    name: 'my-service_pgdata',
    driver: 'local',
    mountpoint: '/var/lib/docker/volumes/my-service_pgdata/_data',
    scope: 'local',
    labels: { [COMPOSE_PROJECT_LABEL]: 'my-service' },
    ...overrides,
});

/** Builds a mount of a container, overriding only the fields under test. */
const containerMount = (overrides: Partial<RuntimeContainerMount> = {}): RuntimeContainerMount => ({
    name: 'my-service_pgdata',
    type: 'volume',
    source: '/var/lib/docker/volumes/my-service_pgdata/_data',
    destination: '/data',
    readOnly: false,
    ...overrides,
});

/** Builds a runtime container summary, overriding only the fields under test. */
const containerSummary = (overrides: Partial<RuntimeContainerSummary> = {}): RuntimeContainerSummary => ({
    id: 'c1d2e3f4a5b6c1d2e3f4a5b6',
    names: ['/my-service-web-1'],
    image: 'nginx:latest',
    state: 'running',
    status: 'Up 2 hours',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    projects: ['my-service'],
    serviceId: null,
    ports: [],
    networks: [],
    mounts: [containerMount()],
    ...overrides,
});

describe('DockerVolumesRepository', () => {
    const service: Service = {
        id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
        name: 'My Service!',
        description: '',
        projectId: 'b2a2132b-d6b7-464a-8aaf-c659a3ca0d60',
        providerId: null,
        composeProject: 'gitpaas_web',
        repositoryId: '42',
        deploymentBranch: 'main',
        composerPath: 'docker-compose.yml',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    let mockListVolumes: jest.Mock;
    let mockListContainers: jest.Mock;
    let mockCreateVolume: jest.Mock;
    let mockPullImage: jest.Mock;
    let mockFollowProgress: jest.Mock;
    let mockRunContainerToCompletion: jest.Mock;
    let mockContainerRuntime: jest.Mocked<
        Pick<
            DockerContainerRuntimeAdapter,
            'listVolumes' | 'listContainers' | 'createVolume' | 'pullImage' | 'followProgress' | 'runContainerToCompletion'
        >
    >;
    let sut: DockerVolumesRepository;

    beforeEach(() => {
        jest.clearAllMocks();

        mockListVolumes = jest.fn().mockResolvedValue([]);
        mockListContainers = jest.fn().mockResolvedValue([]);
        mockCreateVolume = jest.fn().mockResolvedValue('my-service_pgdata');
        mockPullImage = jest.fn().mockResolvedValue('pull-stream');
        mockFollowProgress = jest.fn((_stream: unknown, onFinished: (error: unknown) => void) => {
            onFinished(null);
        });
        mockRunContainerToCompletion = jest.fn().mockResolvedValue(0);
        mockContainerRuntime = {
            listVolumes: mockListVolumes,
            listContainers: mockListContainers,
            createVolume: mockCreateVolume,
            pullImage: mockPullImage,
            followProgress: mockFollowProgress,
            runContainerToCompletion: mockRunContainerToCompletion,
        };
        sut = new DockerVolumesRepository(mockContainerRuntime as unknown as DockerContainerRuntimeAdapter);
    });

    describe('listByService', () => {
        it('lists the volumes scoped to the Compose project of the service, which Compose alone stamps', async () => {
            await sut.listByService(service);

            expect(mockListVolumes).toHaveBeenCalledTimes(1);
            expect(mockListVolumes).toHaveBeenCalledWith({ project: service.composeProject });
        });

        it('never scopes the listing to the labels of GitPaaS, which a volume of Compose never carries', async () => {
            await sut.listByService(service);

            expect(mockListVolumes).not.toHaveBeenCalledWith(
                expect.objectContaining({ labels: managedLabels }),
            );
        });

        it('keeps two Compose projects apart', async () => {
            const sibling: Service = { ...service, composeProject: 'gitpaas_blog' };

            await sut.listByService(service);
            await sut.listByService(sibling);

            expect(mockListVolumes).toHaveBeenNthCalledWith(1, { project: 'gitpaas_web' });
            expect(mockListVolumes).toHaveBeenNthCalledWith(2, { project: 'gitpaas_blog' });
        });

        it('maps every summary of the runtime into the domain model', async () => {
            mockListVolumes.mockResolvedValue([volumeSummary()]);

            await expect(sut.listByService(service)).resolves.toEqual<DaemonVolume[]>([
                {
                    name: 'my-service_pgdata',
                    driver: 'local',
                    mountpoint: '/var/lib/docker/volumes/my-service_pgdata/_data',
                },
            ]);
        });

        it('gives an empty list when the daemon holds no volume of the service', async () => {
            await expect(sut.listByService(service)).resolves.toEqual([]);
        });
    });

    describe('listMountsByService', () => {
        it('lists the containers of the service, the stopped ones included', async () => {
            await sut.listMountsByService(service);

            expect(mockListContainers).toHaveBeenCalledTimes(1);
            expect(mockListContainers).toHaveBeenCalledWith(
                { labels: managedLabels, service: service.id },
                true,
            );
        });

        it('names the container of each mount, with no leading slash', async () => {
            mockListContainers.mockResolvedValue([containerSummary()]);

            await expect(sut.listMountsByService(service)).resolves.toEqual([
                { volumeName: 'my-service_pgdata', containerName: 'my-service-web-1' },
            ]);
        });

        it('falls back to the short id when the container carries no name', async () => {
            mockListContainers.mockResolvedValue([containerSummary({ names: [] })]);

            const [mount] = await sut.listMountsByService(service);

            expect(mount?.containerName).toBe('c1d2e3f4a5b6');
        });

        it('drops a bind mount, which carries no name of a volume', async () => {
            mockListContainers.mockResolvedValue([
                containerSummary({ mounts: [containerMount({ name: null, type: 'bind' })] }),
            ]);

            await expect(sut.listMountsByService(service)).resolves.toEqual([]);
        });

        it('gathers the mounts of every container of the service', async () => {
            mockListContainers.mockResolvedValue([
                containerSummary(),
                containerSummary({ id: 'other', names: ['/my-service-worker-1'] }),
            ]);

            await expect(sut.listMountsByService(service)).resolves.toHaveLength(2);
        });

        it('gives an empty list when no container of the service runs', async () => {
            await expect(sut.listMountsByService(service)).resolves.toEqual([]);
        });
    });

    describe('create', () => {
        it('creates the volume with the labels of GitPaaS, of the service and of the Compose project of the service', async () => {
            await sut.create(service, 'my-service_gitpaas-1');

            expect(mockCreateVolume).toHaveBeenCalledTimes(1);
            expect(mockCreateVolume).toHaveBeenCalledWith({
                name: 'my-service_gitpaas-1',
                labels: {
                    ...managedLabels,
                    [GITPAAS_SERVICE_LABEL]: service.id,
                    [COMPOSE_PROJECT_LABEL]: 'gitpaas_web',
                },
            });
        });

        it('propagates the failure of the daemon', async () => {
            const error = new Error('daemon down');

            mockCreateVolume.mockRejectedValue(error);

            await expect(sut.create(service, 'my-service_gitpaas-1')).rejects.toThrow(error);
        });
    });

    describe('findByName', () => {
        it('reads the volumes of the daemon with no filter, because a volume of an old name carries no label of GitPaaS', async () => {
            await sut.findByName('my-service_gitpaas-1');

            expect(mockListVolumes).toHaveBeenCalledTimes(1);
            expect(mockListVolumes).toHaveBeenCalledWith({});
        });

        it('maps the volume the daemon holds under that name into the domain model', async () => {
            mockListVolumes.mockResolvedValue([
                volumeSummary({ name: 'other' }),
                volumeSummary({ name: 'my-service_gitpaas-1', mountpoint: '/var/lib/docker/volumes/my-service_gitpaas-1/_data' }),
            ]);

            await expect(sut.findByName('my-service_gitpaas-1')).resolves.toEqual<DaemonVolume>({
                name: 'my-service_gitpaas-1',
                driver: 'local',
                mountpoint: '/var/lib/docker/volumes/my-service_gitpaas-1/_data',
            });
        });

        it('gives null when the daemon holds no volume of that name', async () => {
            mockListVolumes.mockResolvedValue([volumeSummary({ name: 'other' })]);

            await expect(sut.findByName('my-service_gitpaas-1')).resolves.toBeNull();
        });
    });

    describe('copyData', () => {
        it('pulls the image of the copy before it runs the temporary container', async () => {
            await sut.copyData('my-service_gitpaas-1', 'gitpaas_web_gitpaas-1');

            expect(mockPullImage).toHaveBeenCalledTimes(1);
            expect(mockPullImage).toHaveBeenCalledWith('busybox:1.37');
            expect(mockPullImage.mock.invocationCallOrder[0])
                .toBeLessThan(mockRunContainerToCompletion.mock.invocationCallOrder[0]);
        });

        it('copies the data with a temporary container that reads the source read-only and carries the marker of GitPaaS', async () => {
            await sut.copyData('my-service_gitpaas-1', 'gitpaas_web_gitpaas-1');

            expect(mockRunContainerToCompletion).toHaveBeenCalledTimes(1);
            expect(mockRunContainerToCompletion).toHaveBeenCalledWith({
                image: 'busybox:1.37',
                command: ['sh', '-c', 'cp -a /gitpaas/source/. /gitpaas/target/'],
                binds: ['my-service_gitpaas-1:/gitpaas/source:ro', 'gitpaas_web_gitpaas-1:/gitpaas/target'],
                labels: managedLabels,
            });
        });

        it('throws when the temporary container ends with a code other than zero, so the deployment never starts on empty data', async () => {
            mockRunContainerToCompletion.mockResolvedValue(1);

            await expect(sut.copyData('my-service_gitpaas-1', 'gitpaas_web_gitpaas-1')).rejects.toThrow(
                'The copy of the volume my-service_gitpaas-1 into gitpaas_web_gitpaas-1 ended with the code 1',
            );
        });

        it('propagates the failure of the pull, and runs no container', async () => {
            mockFollowProgress.mockImplementation((_stream: unknown, onFinished: (error: unknown) => void) => {
                onFinished(new Error('no such image'));
            });

            await expect(sut.copyData('my-service_gitpaas-1', 'gitpaas_web_gitpaas-1')).rejects.toThrow('no such image');
            expect(mockRunContainerToCompletion).not.toHaveBeenCalled();
        });
    });
});
