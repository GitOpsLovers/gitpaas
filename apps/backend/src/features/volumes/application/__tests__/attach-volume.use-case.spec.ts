import type { AttachVolumeDto } from '@gitpaas/contracts';

import { VolumeMountPathTakenError, VolumeNotFoundError } from '../../domain/errors/volume.errors';
import { ServiceVolumeMount, Volume } from '../../domain/models/volume.models';
import { ServiceVolumesRepository } from '../../domain/repositories/service-volumes.repository';
import { VolumesRepository } from '../../domain/repositories/volumes.repository';
import { attachVolumeUseCase } from '../attach-volume.use-case';

const serviceId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
const volumeId = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';

/** Builds a volume of the database fixture, overriding only the fields under test. */
const volume = (overrides: Partial<Volume> = {}): Volume => ({
    id: volumeId, serviceId, name: 'data', daemonKey: `gitpaas-${volumeId}`, origin: 'gitpaas', ...overrides,
});

/** Builds a mount of the join fixture, overriding only the fields under test. */
const mount = (overrides: Partial<ServiceVolumeMount> = {}): ServiceVolumeMount => ({
    volumeId, composeServiceName: 'app', containerPath: '/data', readOnly: false, ...overrides,
});

const attachDto: AttachVolumeDto = { composeServiceName: 'app', containerPath: '/data', readOnly: false };

describe('attachVolumeUseCase', () => {
    let mockVolumesRepository: jest.Mocked<Pick<VolumesRepository, 'findById'>>;
    let mockServiceVolumesRepository: jest.Mocked<Pick<ServiceVolumesRepository, 'listByService' | 'attach'>>;

    beforeEach(() => {
        jest.clearAllMocks();

        mockVolumesRepository = { findById: jest.fn() };
        mockServiceVolumesRepository = { listByService: jest.fn(), attach: jest.fn() };

        mockVolumesRepository.findById.mockResolvedValue(volume());
        mockServiceVolumesRepository.listByService.mockResolvedValue([]);
    });

    /** Runs the use case with the mocked ports. */
    const run = (dto: AttachVolumeDto = attachDto) => attachVolumeUseCase(
        mockVolumesRepository as unknown as VolumesRepository,
        mockServiceVolumesRepository as unknown as ServiceVolumesRepository,
        serviceId,
        volumeId,
        dto,
    );

    it('throws when the service holds no volume of that id', async () => {
        mockVolumesRepository.findById.mockResolvedValue(null);

        await expect(run()).rejects.toBeInstanceOf(VolumeNotFoundError);
    });

    it('throws when the volume belongs to another service', async () => {
        mockVolumesRepository.findById.mockResolvedValue(volume({ serviceId: 'other' }));

        await expect(run()).rejects.toBeInstanceOf(VolumeNotFoundError);
    });

    it('never writes the join when the volume is absent', async () => {
        mockVolumesRepository.findById.mockResolvedValue(null);

        await expect(run()).rejects.toThrow();

        expect(mockServiceVolumesRepository.attach).not.toHaveBeenCalled();
    });

    it('throws when another volume of the service already mounts at that path', async () => {
        mockServiceVolumesRepository.listByService.mockResolvedValue([
            mount({ volumeId: 'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f' }),
        ]);

        await expect(run()).rejects.toBeInstanceOf(VolumeMountPathTakenError);
    });

    it('accepts the path the volume under change already holds', async () => {
        mockServiceVolumesRepository.listByService.mockResolvedValue([mount()]);

        await expect(run()).resolves.toBeUndefined();
    });

    it('writes the mount of the volume', async () => {
        await run();

        expect(mockServiceVolumesRepository.attach).toHaveBeenCalledTimes(1);
        expect(mockServiceVolumesRepository.attach).toHaveBeenCalledWith(serviceId, volumeId, {
            composeServiceName: 'app', containerPath: '/data', readOnly: false,
        });
    });

    it('keeps the mode read-only the body carries', async () => {
        await run({ ...attachDto, readOnly: true });

        expect(mockServiceVolumesRepository.attach).toHaveBeenCalledWith(
            serviceId,
            volumeId,
            expect.objectContaining({ readOnly: true }),
        );
    });

    it('propagates the failure of the write', async () => {
        const error = new Error('write failed');

        mockServiceVolumesRepository.attach.mockRejectedValue(error);

        await expect(run()).rejects.toThrow(error);
    });
});
