/* eslint-disable no-secrets/no-secrets */
import { Repository } from 'typeorm';

import { DbServiceVolumeEntity } from '../db-service-volume.entity';
import { DatabaseServiceVolumesRepository } from '../db-service-volumes.repository';

const serviceId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
const volumeId = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';
const mount = { composeServiceName: 'app', containerPath: '/data', readOnly: false };

/** Builds a service volume database-entity fixture, overriding only the fields under test. */
const joinEntity = (overrides: Partial<DbServiceVolumeEntity> = {}): DbServiceVolumeEntity => ({
    serviceId, volumeId, containerPath: '/data', readOnly: false, composeServiceName: 'app', ...overrides,
});

describe('DatabaseServiceVolumesRepository', () => {
    let mockRepository: jest.Mocked<Pick<Repository<DbServiceVolumeEntity>, 'find'>>;
    let sut: DatabaseServiceVolumesRepository;

    beforeEach(() => {
        jest.clearAllMocks();

        mockRepository = { find: jest.fn() };
        sut = new DatabaseServiceVolumesRepository(
            mockRepository as unknown as Repository<DbServiceVolumeEntity>,
        );
    });

    describe('listByService', () => {
        it('reads the mounts of the service, ordered by the mount path', async () => {
            mockRepository.find.mockResolvedValue([]);

            await sut.listByService(serviceId);

            expect(mockRepository.find).toHaveBeenCalledTimes(1);
            expect(mockRepository.find).toHaveBeenCalledWith({
                where: { serviceId }, order: { containerPath: 'ASC' },
            });
        });

        it('maps every row into the mount of the domain', async () => {
            mockRepository.find.mockResolvedValue([joinEntity()]);

            await expect(sut.listByService(serviceId)).resolves.toEqual([{ volumeId, ...mount }]);
        });

        it('gives an empty list when the service mounts no volume', async () => {
            mockRepository.find.mockResolvedValue([]);

            await expect(sut.listByService(serviceId)).resolves.toEqual([]);
        });
    });
});
