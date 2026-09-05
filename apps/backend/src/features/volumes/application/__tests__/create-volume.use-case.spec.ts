import type { CreateVolumeDto } from '@gitpaas/contracts';

import { VolumeMountPathTakenError, VolumeNameTakenError } from '../../domain/errors/volume.errors';
import { ServiceVolumeMount, Volume } from '../../domain/models/volume.models';
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
    daemonKey: 'data',
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

    beforeEach(() => {
        jest.clearAllMocks();

        mockServicesRepository = { findById: jest.fn() };
        mockVolumesRepository = { listByService: jest.fn(), create: jest.fn() };
        mockServiceVolumesRepository = { listByService: jest.fn(), attach: jest.fn() };

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
        serviceId,
        dto,
    );

    it('throws when no service carries that id', async () => {
        mockServicesRepository.findById.mockResolvedValue(null);

        await expect(run()).rejects.toBeInstanceOf(ServiceNotFoundError);
    });

    it('throws when another volume of the service carries that name under another key', async () => {
        mockVolumesRepository.listByService.mockResolvedValue([volume({ daemonKey: 'legacy' })]);

        await expect(run()).rejects.toBeInstanceOf(VolumeNameTakenError);
    });

    it('throws when another volume of the service already mounts at that path', async () => {
        mockServiceVolumesRepository.listByService.mockResolvedValue([mount()]);

        await expect(run()).rejects.toBeInstanceOf(VolumeMountPathTakenError);
    });

    it('writes no row when the mount path is taken', async () => {
        mockServiceVolumesRepository.listByService.mockResolvedValue([mount()]);

        await expect(run()).rejects.toThrow();

        expect(mockVolumesRepository.create).not.toHaveBeenCalled();
    });

    it('writes the volume with the origin gitpaas, because GitPaaS owns the record', async () => {
        await run();

        expect(mockVolumesRepository.create).toHaveBeenCalledTimes(1);
        expect(mockVolumesRepository.create).toHaveBeenCalledWith(expect.objectContaining({
            serviceId, name: 'data', origin: 'gitpaas',
        }));
    });

    it('takes the name of the body as the key of the Compose file, which Compose creates the volume from', async () => {
        await run();

        const [created] = mockVolumesRepository.create.mock.calls[0] ?? [];

        expect(created?.daemonKey).toBe('data');
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

    it('gives the created volume the state pending, because the next deployment creates it on the daemon', async () => {
        const result = await run();

        expect(result.state).toBe('pending');
        expect(result.containers).toEqual([]);
        expect(result.daemonName).toBe('gitpaas_web_data');
    });

    describe('when the service already holds a volume of that key', () => {
        beforeEach(() => {
            mockVolumesRepository.listByService.mockResolvedValue([volume({ name: 'archive' })]);
        });

        it('writes no second row, because the volume of the daemon keeps its data', async () => {
            await run();

            expect(mockVolumesRepository.create).not.toHaveBeenCalled();
        });

        it('attaches the mount of the body to the volume that already exists', async () => {
            await run();

            expect(mockServiceVolumesRepository.attach).toHaveBeenCalledTimes(1);
            expect(mockServiceVolumesRepository.attach).toHaveBeenCalledWith(serviceId, volume().id, {
                composeServiceName: 'app', containerPath: '/data', readOnly: false,
            });
        });

        it('answers with the volume that already exists, and with the name it carries on the daemon', async () => {
            const result = await run();

            expect(result).toEqual(expect.objectContaining({
                id: volume().id, name: 'archive', daemonName: 'gitpaas_web_data', state: 'pending',
            }));
        });

        it('keeps the mount path the volume itself already holds', async () => {
            mockServiceVolumesRepository.listByService.mockResolvedValue([mount({ volumeId: volume().id })]);

            await expect(run()).resolves.toEqual(expect.objectContaining({ id: volume().id }));
        });

        it('throws when another volume of the service already mounts at that path', async () => {
            mockServiceVolumesRepository.listByService.mockResolvedValue([mount()]);

            await expect(run()).rejects.toBeInstanceOf(VolumeMountPathTakenError);
        });
    });
});
