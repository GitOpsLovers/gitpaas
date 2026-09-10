import { Test } from '@nestjs/testing';

import { getVolumesByServiceUseCase } from '../../../application/get-volumes-by-service.use-case';
import { VolumeStatus } from '../../../domain/models/volume.models';
import { DatabaseServiceVolumesRepository } from '../../../infrastructure/database/db-service-volumes.repository';
import { DatabaseVolumesRepository } from '../../../infrastructure/database/db-volumes.repository';
import { DockerVolumesRepository } from '../../../infrastructure/docker/docker-volumes.repository';
import { VolumesService } from '../volumes.service';

import { DatabaseServicesRepository } from '@features/services/infrastructure/database/db-services.repository';

jest.mock('../../../application/get-volumes-by-service.use-case');

const mockGetVolumesByServiceUseCase = getVolumesByServiceUseCase as jest.MockedFunction<
    typeof getVolumesByServiceUseCase
>;

const serviceId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
const volumeId = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';

const volume: VolumeStatus = {
    id: volumeId,
    name: 'data',
    daemonName: `api_gitpaas-${volumeId}`,
    state: 'pending',
    containers: [],
};

describe('VolumesService', () => {
    let mockServicesRepository: jest.Mocked<DatabaseServicesRepository>;
    let mockVolumesRepository: jest.Mocked<DatabaseVolumesRepository>;
    let mockServiceVolumesRepository: jest.Mocked<DatabaseServiceVolumesRepository>;
    let mockDaemonVolumesRepository: jest.Mocked<DockerVolumesRepository>;
    let sut: VolumesService;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockServicesRepository = {} as jest.Mocked<DatabaseServicesRepository>;
        mockVolumesRepository = {} as jest.Mocked<DatabaseVolumesRepository>;
        mockServiceVolumesRepository = {} as jest.Mocked<DatabaseServiceVolumesRepository>;
        mockDaemonVolumesRepository = {} as jest.Mocked<DockerVolumesRepository>;

        const moduleRef = await Test.createTestingModule({
            providers: [
                VolumesService,
                { provide: DatabaseServicesRepository, useValue: mockServicesRepository },
                { provide: DatabaseVolumesRepository, useValue: mockVolumesRepository },
                { provide: DatabaseServiceVolumesRepository, useValue: mockServiceVolumesRepository },
                { provide: DockerVolumesRepository, useValue: mockDaemonVolumesRepository },
            ],
        }).compile();

        sut = moduleRef.get(VolumesService);
    });

    describe('getByService', () => {
        it('sends every repository and the identifier of the service to the use case', async () => {
            mockGetVolumesByServiceUseCase.mockResolvedValue([]);

            await sut.getByService(serviceId);

            expect(mockGetVolumesByServiceUseCase).toHaveBeenCalledTimes(1);
            expect(mockGetVolumesByServiceUseCase).toHaveBeenCalledWith(
                mockServicesRepository,
                mockVolumesRepository,
                mockServiceVolumesRepository,
                mockDaemonVolumesRepository,
                serviceId,
            );
        });

        it('gives the volumes of the use case back', async () => {
            mockGetVolumesByServiceUseCase.mockResolvedValue([volume]);

            await expect(sut.getByService(serviceId)).resolves.toEqual([volume]);
        });

        it('gives an empty list back', async () => {
            mockGetVolumesByServiceUseCase.mockResolvedValue([]);

            await expect(sut.getByService(serviceId)).resolves.toEqual([]);
        });

        it('propagates the error of the use case', async () => {
            const error = new Error('daemon down');

            mockGetVolumesByServiceUseCase.mockRejectedValue(error);

            await expect(sut.getByService(serviceId)).rejects.toThrow(error);
        });
    });
});
