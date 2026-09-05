import type { UpdateVolumeDto } from '@gitpaas/contracts';

import { VolumeNameTakenError, VolumeNotFoundError } from '../../domain/errors/volume.errors';
import { ServiceVolumeMount, Volume } from '../../domain/models/volume.models';
import { DaemonVolumesRepository } from '../../domain/repositories/daemon-volumes.repository';
import { ServiceVolumesRepository } from '../../domain/repositories/service-volumes.repository';
import { VolumesRepository } from '../../domain/repositories/volumes.repository';
import { renameVolumeUseCase } from '../rename-volume.use-case';

import { ServiceNotFoundError } from '@features/services/domain/errors/service.errors';
import { Service } from '@features/services/domain/models/service.models';
import { ServicesRepository } from '@features/services/domain/repositories/services.repository';

const serviceId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
const volumeId = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';
const daemonKey = 'pgdata';
const daemonName = `gitpaas_web_${daemonKey}`;

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

/** Builds a mount of the join fixture, overriding only the fields under test. */
const mount = (overrides: Partial<ServiceVolumeMount> = {}): ServiceVolumeMount => ({
    volumeId, composeServiceName: 'app', containerPath: '/data', readOnly: false, ...overrides,
});

const updateDto: UpdateVolumeDto = { name: 'archive' };

describe('renameVolumeUseCase', () => {
    let mockServicesRepository: jest.Mocked<Pick<ServicesRepository, 'findById'>>;
    let mockVolumesRepository: jest.Mocked<Pick<VolumesRepository, 'findById' | 'listByService' | 'rename'>>;
    let mockServiceVolumesRepository: jest.Mocked<Pick<ServiceVolumesRepository, 'listByService'>>;
    let mockDaemonVolumesRepository: jest.Mocked<
        Pick<DaemonVolumesRepository, 'listByService' | 'listMountsByService'>
    >;

    beforeEach(() => {
        jest.clearAllMocks();

        mockServicesRepository = { findById: jest.fn() };
        mockVolumesRepository = { findById: jest.fn(), listByService: jest.fn(), rename: jest.fn() };
        mockServiceVolumesRepository = { listByService: jest.fn() };
        mockDaemonVolumesRepository = { listByService: jest.fn(), listMountsByService: jest.fn() };

        mockServicesRepository.findById.mockResolvedValue(service());
        mockVolumesRepository.findById.mockResolvedValue(volume());
        mockVolumesRepository.listByService.mockResolvedValue([volume()]);
        mockVolumesRepository.rename.mockResolvedValue(volume({ name: 'archive' }));
        mockServiceVolumesRepository.listByService.mockResolvedValue([]);
        mockDaemonVolumesRepository.listByService.mockResolvedValue([
            { name: daemonName, driver: 'local', mountpoint: `/var/lib/docker/volumes/${daemonName}/_data` },
        ]);
        mockDaemonVolumesRepository.listMountsByService.mockResolvedValue([]);
    });

    /** Runs the use case with the mocked ports. */
    const run = (dto: UpdateVolumeDto = updateDto) => renameVolumeUseCase(
        mockServicesRepository as unknown as ServicesRepository,
        mockVolumesRepository as unknown as VolumesRepository,
        mockServiceVolumesRepository as unknown as ServiceVolumesRepository,
        mockDaemonVolumesRepository as unknown as DaemonVolumesRepository,
        serviceId,
        volumeId,
        dto,
    );

    it('throws when no service carries that id', async () => {
        mockServicesRepository.findById.mockResolvedValue(null);

        await expect(run()).rejects.toBeInstanceOf(ServiceNotFoundError);
    });

    it('throws when the service holds no volume of that id', async () => {
        mockVolumesRepository.findById.mockResolvedValue(null);

        await expect(run()).rejects.toBeInstanceOf(VolumeNotFoundError);
    });

    it('throws when the volume belongs to another service', async () => {
        mockVolumesRepository.findById.mockResolvedValue(volume({ serviceId: 'other' }));

        await expect(run()).rejects.toBeInstanceOf(VolumeNotFoundError);
    });

    it('throws when the service already holds another volume of that name', async () => {
        mockVolumesRepository.listByService.mockResolvedValue([
            volume(),
            volume({ id: 'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f', name: 'archive' }),
        ]);

        await expect(run()).rejects.toBeInstanceOf(VolumeNameTakenError);
    });

    it('never writes when the name is taken', async () => {
        mockVolumesRepository.listByService.mockResolvedValue([
            volume(),
            volume({ id: 'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f', name: 'archive' }),
        ]);

        await expect(run()).rejects.toThrow();

        expect(mockVolumesRepository.rename).not.toHaveBeenCalled();
    });

    it('accepts the name the volume already carries', async () => {
        await expect(run({ name: 'data' })).resolves.toEqual(expect.objectContaining({ name: 'archive' }));
    });

    it('delegates the rename to the repository', async () => {
        await run();

        expect(mockVolumesRepository.rename).toHaveBeenCalledTimes(1);
        expect(mockVolumesRepository.rename).toHaveBeenCalledWith(volumeId, 'archive');
    });

    it('throws when the volume left the database between the read and the write', async () => {
        mockVolumesRepository.rename.mockResolvedValue(null);

        await expect(run()).rejects.toBeInstanceOf(VolumeNotFoundError);
    });

    it('keeps the name of the daemon, because the daemon renames no volume', async () => {
        const result = await run();

        expect(result.daemonName).toBe(daemonName);
    });

    it('gives the renamed volume the state declared when no service of the Compose file mounts it', async () => {
        const result = await run();

        expect(result.state).toBe('declared');
    });

    it('gives the renamed volume the state pending when a mount waits for the next deployment', async () => {
        mockServiceVolumesRepository.listByService.mockResolvedValue([mount()]);

        const result = await run();

        expect(result.state).toBe('pending');
        expect(result.mount).toEqual({ composeServiceName: 'app', containerPath: '/data', readOnly: false });
    });

    it('gives the renamed volume the state missing when the daemon holds it no longer', async () => {
        mockDaemonVolumesRepository.listByService.mockResolvedValue([]);

        const result = await run();

        expect(result.state).toBe('missing');
    });
});
