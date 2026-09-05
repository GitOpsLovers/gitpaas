import { DaemonVolume } from '../../domain/models/daemon-volume.models';
import { ServiceVolumeMount, Volume } from '../../domain/models/volume.models';
import { DaemonVolumesRepository } from '../../domain/repositories/daemon-volumes.repository';
import { ServiceVolumesRepository } from '../../domain/repositories/service-volumes.repository';
import { VolumesRepository } from '../../domain/repositories/volumes.repository';
import { getVolumesByServiceUseCase } from '../get-volumes-by-service.use-case';

import { ServiceNotFoundError } from '@features/services/domain/errors/service.errors';
import { Service } from '@features/services/domain/models/service.models';
import { ServicesRepository } from '@features/services/domain/repositories/services.repository';

const serviceId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
const volumeId = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';
const daemonKey = `gitpaas-${volumeId}`;
const daemonName = `gitpaas_web_api_${daemonKey}`;

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
    id: volumeId, serviceId, name: 'data', daemonKey, origin: 'gitpaas', ...overrides,
});

/** Builds a volume of the daemon fixture, overriding only the fields under test. */
const daemonVolume = (overrides: Partial<DaemonVolume> = {}): DaemonVolume => ({
    name: daemonName, driver: 'local', mountpoint: `/var/lib/docker/volumes/${daemonName}/_data`, ...overrides,
});

/** Builds a mount of the join fixture, overriding only the fields under test. */
const mount = (overrides: Partial<ServiceVolumeMount> = {}): ServiceVolumeMount => ({
    volumeId, composeServiceName: 'app', containerPath: '/data', readOnly: false, ...overrides,
});

describe('getVolumesByServiceUseCase', () => {
    let mockServicesRepository: jest.Mocked<Pick<ServicesRepository, 'findById'>>;
    let mockVolumesRepository: jest.Mocked<Pick<VolumesRepository, 'listByService'>>;
    let mockServiceVolumesRepository: jest.Mocked<Pick<ServiceVolumesRepository, 'listByService'>>;
    let mockDaemonVolumesRepository: jest.Mocked<
        Pick<DaemonVolumesRepository, 'listByService' | 'listMountsByService'>
    >;

    beforeEach(() => {
        jest.clearAllMocks();

        mockServicesRepository = { findById: jest.fn() };
        mockVolumesRepository = { listByService: jest.fn() };
        mockServiceVolumesRepository = { listByService: jest.fn() };
        mockDaemonVolumesRepository = { listByService: jest.fn(), listMountsByService: jest.fn() };

        mockServicesRepository.findById.mockResolvedValue(service());
        mockVolumesRepository.listByService.mockResolvedValue([]);
        mockServiceVolumesRepository.listByService.mockResolvedValue([]);
        mockDaemonVolumesRepository.listByService.mockResolvedValue([]);
        mockDaemonVolumesRepository.listMountsByService.mockResolvedValue([]);
    });

    /** Runs the use case with the mocked ports. */
    const run = () => getVolumesByServiceUseCase(
        mockServicesRepository as unknown as ServicesRepository,
        mockVolumesRepository as unknown as VolumesRepository,
        mockServiceVolumesRepository as unknown as ServiceVolumesRepository,
        mockDaemonVolumesRepository as unknown as DaemonVolumesRepository,
        serviceId,
    );

    it('throws when no service carries that id', async () => {
        mockServicesRepository.findById.mockResolvedValue(null);

        await expect(run()).rejects.toBeInstanceOf(ServiceNotFoundError);
    });

    it('never reads the daemon when the service is absent', async () => {
        mockServicesRepository.findById.mockResolvedValue(null);

        await expect(run()).rejects.toThrow();

        expect(mockDaemonVolumesRepository.listByService).not.toHaveBeenCalled();
    });

    it('gives an empty list when the service holds no volume', async () => {
        await expect(run()).resolves.toEqual([]);
    });

    it('builds the name of the daemon from the Compose project, the slug of the service and the key of the volume', async () => {
        mockVolumesRepository.listByService.mockResolvedValue([volume()]);
        mockDaemonVolumesRepository.listByService.mockResolvedValue([daemonVolume()]);

        const [result] = await run();

        expect(result?.daemonName).toBe(daemonName);
    });

    it('gives a volume the state mounted when a container of the service mounts it', async () => {
        mockVolumesRepository.listByService.mockResolvedValue([volume()]);
        mockServiceVolumesRepository.listByService.mockResolvedValue([mount()]);
        mockDaemonVolumesRepository.listByService.mockResolvedValue([daemonVolume()]);
        mockDaemonVolumesRepository.listMountsByService.mockResolvedValue([
            { volumeName: daemonName, containerName: 'api-app-1' },
        ]);

        const [result] = await run();

        expect(result?.state).toBe('mounted');
        expect(result?.containers).toEqual(['api-app-1']);
    });

    it('gives a volume the state pending while the mount waits for the next deployment', async () => {
        mockVolumesRepository.listByService.mockResolvedValue([volume()]);
        mockServiceVolumesRepository.listByService.mockResolvedValue([mount()]);
        mockDaemonVolumesRepository.listByService.mockResolvedValue([daemonVolume()]);

        const [result] = await run();

        expect(result?.state).toBe('pending');
        expect(result?.mount).toEqual({ composeServiceName: 'app', containerPath: '/data', readOnly: false });
    });

    it('gives a volume the state declared when the service attached it to no service of the Compose file', async () => {
        mockVolumesRepository.listByService.mockResolvedValue([volume()]);
        mockDaemonVolumesRepository.listByService.mockResolvedValue([daemonVolume()]);

        const [result] = await run();

        expect(result?.state).toBe('declared');
    });

    it('gives a volume the state missing when the daemon holds it no longer', async () => {
        mockVolumesRepository.listByService.mockResolvedValue([volume()]);

        const [result] = await run();

        expect(result?.state).toBe('missing');
    });

    it('gives the state orphan to a volume of the daemon that the database does not hold', async () => {
        mockDaemonVolumesRepository.listByService.mockResolvedValue([daemonVolume({ name: 'gitpaas_web_api_pgdata' })]);

        const [result] = await run();

        expect(result).toEqual({
            id: 'gitpaas_web_api_pgdata',
            name: 'pgdata',
            daemonName: 'gitpaas_web_api_pgdata',
            origin: 'compose',
            state: 'orphan',
            driver: 'local',
            mountpoint: `/var/lib/docker/volumes/${daemonName}/_data`,
            containers: [],
        });
    });

    it('reads the origin gitpaas of an orphan whose key carries the prefix of GitPaaS', async () => {
        mockDaemonVolumesRepository.listByService.mockResolvedValue([daemonVolume()]);

        const [result] = await run();

        expect(result?.origin).toBe('gitpaas');
    });

    it('never gives the state orphan to a volume the database holds', async () => {
        mockVolumesRepository.listByService.mockResolvedValue([volume()]);
        mockDaemonVolumesRepository.listByService.mockResolvedValue([daemonVolume()]);

        const result = await run();

        expect(result).toHaveLength(1);
        expect(result[0]?.state).toBe('declared');
    });

    it('names the containers that mount an orphan', async () => {
        mockDaemonVolumesRepository.listByService.mockResolvedValue([daemonVolume({ name: 'gitpaas_web_api_pgdata' })]);
        mockDaemonVolumesRepository.listMountsByService.mockResolvedValue([
            { volumeName: 'gitpaas_web_api_pgdata', containerName: 'api-db-1' },
        ]);

        const [result] = await run();

        expect(result?.containers).toEqual(['api-db-1']);
    });

    it('propagates the failure of the daemon', async () => {
        const error = new Error('daemon down');

        mockDaemonVolumesRepository.listByService.mockRejectedValue(error);

        await expect(run()).rejects.toThrow(error);
    });
});
