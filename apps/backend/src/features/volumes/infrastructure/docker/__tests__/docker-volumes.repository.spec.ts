import { DaemonVolume } from '../../../domain/models/daemon-volume.models';
import { DockerVolumesRepository } from '../docker-volumes.repository';

import { GITPAAS_MANAGED_LABEL, GITPAAS_MANAGED_VALUE } from '@core/domain/constants/gitpaas-labels.constants';
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
        repositoryId: '42',
        deploymentBranch: 'main',
        composerPath: 'docker-compose.yml',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    let mockListVolumes: jest.Mock;
    let mockListContainers: jest.Mock;
    let mockCreateVolume: jest.Mock;
    let mockContainerRuntime: jest.Mocked<
        Pick<DockerContainerRuntimeAdapter, 'listVolumes' | 'listContainers' | 'createVolume'>
    >;
    let sut: DockerVolumesRepository;

    beforeEach(() => {
        jest.clearAllMocks();

        mockListVolumes = jest.fn().mockResolvedValue([]);
        mockListContainers = jest.fn().mockResolvedValue([]);
        mockCreateVolume = jest.fn().mockResolvedValue('my-service_pgdata');
        mockContainerRuntime = {
            listVolumes: mockListVolumes, listContainers: mockListContainers, createVolume: mockCreateVolume,
        };
        sut = new DockerVolumesRepository(mockContainerRuntime as unknown as DockerContainerRuntimeAdapter);
    });

    describe('listByService', () => {
        it('lists the volumes scoped to the marker of GitPaaS and to the slug of the service', async () => {
            await sut.listByService(service);

            expect(mockListVolumes).toHaveBeenCalledTimes(1);
            expect(mockListVolumes).toHaveBeenCalledWith({ labels: managedLabels, project: 'my-service' });
        });

        it('falls back to a project service-<id> when the name slugifies to empty', async () => {
            const unnamed: Service = { ...service, name: '!!!' };

            await sut.listByService(unnamed);

            expect(mockListVolumes).toHaveBeenCalledWith({
                labels: managedLabels, project: `service-${unnamed.id}`,
            });
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
                { labels: managedLabels, project: 'my-service' },
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
        it('creates the volume with the labels of GitPaaS and of the Compose project of the service', async () => {
            await sut.create(service, 'my-service_gitpaas-1');

            expect(mockCreateVolume).toHaveBeenCalledTimes(1);
            expect(mockCreateVolume).toHaveBeenCalledWith({
                name: 'my-service_gitpaas-1',
                labels: { ...managedLabels, [COMPOSE_PROJECT_LABEL]: 'my-service' },
            });
        });

        it('propagates the failure of the daemon', async () => {
            const error = new Error('daemon down');

            mockCreateVolume.mockRejectedValue(error);

            await expect(sut.create(service, 'my-service_gitpaas-1')).rejects.toThrow(error);
        });
    });
});
