import { VolumeNotAttachedError, VolumeNotFoundError } from '../../domain/errors/volume.errors';
import { Volume } from '../../domain/models/volume.models';
import { ServiceVolumesRepository } from '../../domain/repositories/service-volumes.repository';
import { VolumesRepository } from '../../domain/repositories/volumes.repository';
import { detachVolumeUseCase } from '../detach-volume.use-case';

const serviceId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
const volumeId = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';

/** Builds a volume of the database fixture, overriding only the fields under test. */
const volume = (overrides: Partial<Volume> = {}): Volume => ({
    id: volumeId, serviceId, name: 'data', daemonKey: `gitpaas-${volumeId}`, origin: 'gitpaas', ...overrides,
});

describe('detachVolumeUseCase', () => {
    let mockVolumesRepository: jest.Mocked<Pick<VolumesRepository, 'findById'>>;
    let mockServiceVolumesRepository: jest.Mocked<Pick<ServiceVolumesRepository, 'detach'>>;

    beforeEach(() => {
        jest.clearAllMocks();

        mockVolumesRepository = { findById: jest.fn() };
        mockServiceVolumesRepository = { detach: jest.fn() };

        mockVolumesRepository.findById.mockResolvedValue(volume());
        mockServiceVolumesRepository.detach.mockResolvedValue(true);
    });

    /** Runs the use case with the mocked ports. */
    const run = () => detachVolumeUseCase(
        mockVolumesRepository as unknown as VolumesRepository,
        mockServiceVolumesRepository as unknown as ServiceVolumesRepository,
        serviceId,
        volumeId,
    );

    it('throws when the service holds no volume of that id', async () => {
        mockVolumesRepository.findById.mockResolvedValue(null);

        await expect(run()).rejects.toBeInstanceOf(VolumeNotFoundError);
    });

    it('throws when the volume belongs to another service', async () => {
        mockVolumesRepository.findById.mockResolvedValue(volume({ serviceId: 'other' }));

        await expect(run()).rejects.toBeInstanceOf(VolumeNotFoundError);
    });

    it('never deletes the join when the volume is absent', async () => {
        mockVolumesRepository.findById.mockResolvedValue(null);

        await expect(run()).rejects.toThrow();

        expect(mockServiceVolumesRepository.detach).not.toHaveBeenCalled();
    });

    it('deletes the mount of the volume', async () => {
        await run();

        expect(mockServiceVolumesRepository.detach).toHaveBeenCalledTimes(1);
        expect(mockServiceVolumesRepository.detach).toHaveBeenCalledWith(serviceId, volumeId);
    });

    it('throws when the service mounts no such volume', async () => {
        mockServiceVolumesRepository.detach.mockResolvedValue(false);

        await expect(run()).rejects.toBeInstanceOf(VolumeNotAttachedError);
    });

    it('keeps the volume, because the detach removes the mount alone', async () => {
        await expect(run()).resolves.toBeUndefined();
    });
});
