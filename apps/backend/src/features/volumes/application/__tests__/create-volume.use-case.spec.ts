import type { CreateVolumeDto } from '@gitpaas/contracts';

import { VolumeMountPathTakenError, VolumeNameTakenError } from '../../domain/errors/volume.errors';
import { ServiceVolumeMount, Volume } from '../../domain/models/volume.models';
import { DaemonVolumesRepository } from '../../domain/repositories/daemon-volumes.repository';
import { ServiceVolumesRepository } from '../../domain/repositories/service-volumes.repository';
import { VolumesRepository } from '../../domain/repositories/volumes.repository';
import { createVolumeUseCase } from '../create-volume.use-case';

import { ServiceNotFoundError } from '@features/services/domain/errors/service.errors';
import { Service } from '@features/services/domain/models/service.models';
import { ServicesRepository } from '@features/services/domain/repositories/services.repository';

const serviceId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

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

/** Builds a mount of the join fixture, overriding only the fields under test. */
const mount = (overrides: Partial<ServiceVolumeMount> = {}): ServiceVolumeMount => ({
    volumeId: 'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f',
    composeServiceName: 'app',
    containerPath: '/data',
    readOnly: false,
    ...overrides,
});

const createDto: CreateVolumeDto = {
    name: 'data', composeServiceName: 'app', containerPath: '/data', readOnly: false,
};

describe('createVolumeUseCase', () => {
    let mockServicesRepository: jest.Mocked<Pick<ServicesRepository, 'findById'>>;
    let mockVolumesRepository: jest.Mocked<Pick<VolumesRepository, 'listByService' | 'create'>>;
    let mockServiceVolumesRepository: jest.Mocked<Pick<ServiceVolumesRepository, 'listByService' | 'attach'>>;
    let mockDaemonVolumesRepository: jest.Mocked<Pick<DaemonVolumesRepository, 'create'>>;

    beforeEach(() => {
        jest.clearAllMocks();

        mockServicesRepository = { findById: jest.fn() };
        mockVolumesRepository = { listByService: jest.fn(), create: jest.fn() };
        mockServiceVolumesRepository = { listByService: jest.fn(), attach: jest.fn() };
        mockDaemonVolumesRepository = { create: jest.fn() };

        mockServicesRepository.findById.mockResolvedValue(service());
        mockVolumesRepository.listByService.mockResolvedValue([]);
        mockServiceVolumesRepository.listByService.mockResolvedValue([]);
        mockVolumesRepository.create.mockImplementation((created) => Promise.resolve(created));
    });

    /** Runs the use case with the mocked ports. */
    const run = (dto: CreateVolumeDto = createDto) => createVolumeUseCase(
        mockServicesRepository as unknown as ServicesRepository,
        mockVolumesRepository as unknown as VolumesRepository,
        mockServiceVolumesRepository as unknown as ServiceVolumesRepository,
        mockDaemonVolumesRepository as unknown as DaemonVolumesRepository,
        serviceId,
        dto,
    );

    it('throws when no service carries that id', async () => {
        mockServicesRepository.findById.mockResolvedValue(null);

        await expect(run()).rejects.toBeInstanceOf(ServiceNotFoundError);
    });

    it('throws when the service already holds a volume of that name', async () => {
        mockVolumesRepository.listByService.mockResolvedValue([volume()]);

        await expect(run()).rejects.toBeInstanceOf(VolumeNameTakenError);
    });

    it('throws when another volume of the service already mounts at that path', async () => {
        mockServiceVolumesRepository.listByService.mockResolvedValue([mount()]);

        await expect(run()).rejects.toBeInstanceOf(VolumeMountPathTakenError);
    });

    it('creates nothing on the daemon when the mount path is taken', async () => {
        mockServiceVolumesRepository.listByService.mockResolvedValue([mount()]);

        await expect(run()).rejects.toThrow();

        expect(mockDaemonVolumesRepository.create).not.toHaveBeenCalled();
        expect(mockVolumesRepository.create).not.toHaveBeenCalled();
    });

    it('creates the volume on the daemon under the name of the Compose project and the key of GitPaaS', async () => {
        await run();

        expect(mockDaemonVolumesRepository.create).toHaveBeenCalledTimes(1);
        expect(mockDaemonVolumesRepository.create).toHaveBeenCalledWith(
            service(),
            expect.stringContaining('api_gitpaas-'),
        );
    });

    it('writes the volume with the origin gitpaas, because GitPaaS owns it', async () => {
        await run();

        expect(mockVolumesRepository.create).toHaveBeenCalledWith(expect.objectContaining({
            serviceId, name: 'data', origin: 'gitpaas',
        }));
    });

    it('builds the key of the volume from its own id', async () => {
        await run();

        const [created] = mockVolumesRepository.create.mock.calls[0] ?? [];

        expect(created?.daemonKey).toBe(`gitpaas-${created?.id}`);
    });

    it('attaches the created volume to the service of the Compose file the body names', async () => {
        await run();

        const [created] = mockVolumesRepository.create.mock.calls[0] ?? [];

        expect(mockServiceVolumesRepository.attach).toHaveBeenCalledTimes(1);
        expect(mockServiceVolumesRepository.attach).toHaveBeenCalledWith(serviceId, created?.id, {
            composeServiceName: 'app', containerPath: '/data', readOnly: false,
        });
    });

    it('keeps the mode read-only the body carries', async () => {
        await run({ ...createDto, readOnly: true });

        expect(mockServiceVolumesRepository.attach).toHaveBeenCalledWith(
            serviceId,
            expect.any(String),
            expect.objectContaining({ readOnly: true }),
        );
    });

    it('gives the created volume the state pending, because the mount waits for the next deployment', async () => {
        const result = await run();

        expect(result.state).toBe('pending');
        expect(result.containers).toEqual([]);
        expect(result.daemonName).toBe(`api_gitpaas-${result.id}`);
    });

    it('propagates the failure of the daemon, and writes no row', async () => {
        const error = new Error('daemon down');

        mockDaemonVolumesRepository.create.mockRejectedValue(error);

        await expect(run()).rejects.toThrow(error);

        expect(mockVolumesRepository.create).not.toHaveBeenCalled();
    });
});
