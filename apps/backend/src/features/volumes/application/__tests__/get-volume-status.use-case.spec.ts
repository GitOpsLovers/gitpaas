import { DaemonVolume } from '../../domain/models/daemon-volume.models';
import { ServiceVolumeMount, Volume, VolumeMount } from '../../domain/models/volume.models';
import { DaemonVolumesRepository } from '../../domain/repositories/daemon-volumes.repository';
import {
    getVolumeDaemonViewUseCase,
    getVolumeStateUseCase,
    getVolumeStatusUseCase,
    VolumeDaemonView,
} from '../get-volume-status.use-case';

import { Service } from '@features/services/domain/models/service.models';

const serviceId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
const daemonName = 'api_gitpaas-b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';

/** Builds a service fixture, overriding only the fields under test. */
const service = (overrides: Partial<Service> = {}): Service => ({
    id: serviceId,
    name: 'api',
    description: '',
    projectId: 'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f',
    providerId: null,
    composeProject: 'gitpaas_web',
    repositoryId: 'gitpaas/api',
    deploymentBranch: 'main',
    composerPath: 'docker-compose.yml',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
});

/** Builds a volume of the database fixture, overriding only the fields under test. */
const volume = (overrides: Partial<Volume> = {}): Volume => ({
    id: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
    serviceId,
    name: 'data',
    daemonKey: 'gitpaas-b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
    origin: 'gitpaas',
    ...overrides,
});

/** Builds a volume of the daemon fixture, overriding only the fields under test. */
const daemonVolume = (overrides: Partial<DaemonVolume> = {}): DaemonVolume => ({
    name: daemonName,
    driver: 'local',
    mountpoint: `/var/lib/docker/volumes/${daemonName}/_data`,
    ...overrides,
});

/** Builds the mount of a volume fixture, overriding only the fields under test. */
const mount = (overrides: Partial<VolumeMount> = {}): VolumeMount => ({
    composeServiceName: 'app',
    containerPath: '/data',
    readOnly: false,
    ...overrides,
});

/** Builds the reads of the daemon fixture. */
const view = (volumes: DaemonVolume[] = [], containers: Array<[string, string[]]> = []): VolumeDaemonView => ({
    volumes: new Map(volumes.map((entry) => [entry.name, entry])),
    containers: new Map(containers),
});

describe('getVolumeDaemonViewUseCase', () => {
    let mockDaemonVolumesRepository: jest.Mocked<
        Pick<DaemonVolumesRepository, 'listByService' | 'listMountsByService'>
    >;

    beforeEach(() => {
        jest.clearAllMocks();

        mockDaemonVolumesRepository = { listByService: jest.fn(), listMountsByService: jest.fn() };
    });

    /** Runs the use case with the mocked ports. */
    const run = () => getVolumeDaemonViewUseCase(
        mockDaemonVolumesRepository as unknown as DaemonVolumesRepository,
        service(),
    );

    it('asks the daemon for the volumes of the service', async () => {
        mockDaemonVolumesRepository.listByService.mockResolvedValue([]);
        mockDaemonVolumesRepository.listMountsByService.mockResolvedValue([]);

        await run();

        expect(mockDaemonVolumesRepository.listByService).toHaveBeenCalledTimes(1);
        expect(mockDaemonVolumesRepository.listByService).toHaveBeenCalledWith(service());
    });

    it('keys the volumes of the daemon by their name', async () => {
        mockDaemonVolumesRepository.listByService.mockResolvedValue([daemonVolume()]);
        mockDaemonVolumesRepository.listMountsByService.mockResolvedValue([]);

        const result = await run();

        expect(result.volumes.get(daemonName)).toEqual(daemonVolume());
    });

    it('gathers under one volume every container that mounts it', async () => {
        mockDaemonVolumesRepository.listByService.mockResolvedValue([daemonVolume()]);
        mockDaemonVolumesRepository.listMountsByService.mockResolvedValue([
            { volumeName: daemonName, containerName: 'api-app-1' },
            { volumeName: daemonName, containerName: 'api-worker-1' },
        ]);

        const result = await run();

        expect(result.containers.get(daemonName)).toEqual(['api-app-1', 'api-worker-1']);
    });

    it('gives empty reads when the daemon holds nothing for the service', async () => {
        mockDaemonVolumesRepository.listByService.mockResolvedValue([]);
        mockDaemonVolumesRepository.listMountsByService.mockResolvedValue([]);

        const result = await run();

        expect([...result.volumes.keys()]).toEqual([]);
        expect([...result.containers.keys()]).toEqual([]);
    });
});

describe('getVolumeStateUseCase', () => {
    it('gives mounted when a container of the service mounts the volume', () => {
        expect(getVolumeStateUseCase(daemonVolume(), mount(), ['api-app-1'])).toBe('mounted');
    });

    it('gives missing when the daemon holds no such volume', () => {
        expect(getVolumeStateUseCase(undefined, mount(), [])).toBe('missing');
    });

    it('gives pending when the service attached the volume and no container mounts it yet', () => {
        expect(getVolumeStateUseCase(daemonVolume(), mount(), [])).toBe('pending');
    });

    it('gives declared when the volume exists and no service of the Compose file mounts it', () => {
        expect(getVolumeStateUseCase(daemonVolume(), null, [])).toBe('declared');
    });
});

describe('getVolumeStatusUseCase', () => {
    it('joins the volume of the database with the values the daemon gives it', () => {
        const result = getVolumeStatusUseCase(volume(), daemonName, mount(), view([daemonVolume()]));

        expect(result).toEqual({
            id: volume().id,
            name: 'data',
            daemonName,
            origin: 'gitpaas',
            state: 'pending',
            driver: 'local',
            mountpoint: `/var/lib/docker/volumes/${daemonName}/_data`,
            mount: { composeServiceName: 'app', containerPath: '/data', readOnly: false },
            containers: [],
        });
    });

    it('names the containers that mount the volume, and gives it the state mounted', () => {
        const result = getVolumeStatusUseCase(
            volume(),
            daemonName,
            mount(),
            view([daemonVolume()], [[daemonName, ['api-app-1']]]),
        );

        expect(result.containers).toEqual(['api-app-1']);
        expect(result.state).toBe('mounted');
    });

    it('carries no mount when the service attached the volume to no service of the Compose file', () => {
        const result = getVolumeStatusUseCase(volume(), daemonName, null, view([daemonVolume()]));

        expect(result.mount).toBeUndefined();
    });

    it('carries no driver and no mountpoint when the daemon holds the volume no longer', () => {
        const result = getVolumeStatusUseCase(volume(), daemonName, mount(), view());

        expect(result.driver).toBeUndefined();
        expect(result.mountpoint).toBeUndefined();
        expect(result.state).toBe('missing');
    });

    it('keeps the mount of the volume alone, and drops the id of the join', () => {
        const join: ServiceVolumeMount = { volumeId: volume().id, ...mount() };
        const result = getVolumeStatusUseCase(volume(), daemonName, join, view([daemonVolume()]));

        expect(result.mount).toEqual({ composeServiceName: 'app', containerPath: '/data', readOnly: false });
    });
});
