import type { AttachVolumeDto, CreateVolumeDto, UpdateVolumeDto } from '@gitpaas/contracts';
import { Test } from '@nestjs/testing';

import { attachVolumeUseCase } from '../../../application/attach-volume.use-case';
import { createVolumeUseCase } from '../../../application/create-volume.use-case';
import { detachVolumeUseCase } from '../../../application/detach-volume.use-case';
import { getVolumesByServiceUseCase } from '../../../application/get-volumes-by-service.use-case';
import { renameVolumeUseCase } from '../../../application/rename-volume.use-case';
import { VolumeStatus } from '../../../domain/models/volume.models';
import { DatabaseServiceVolumesRepository } from '../../../infrastructure/database/db-service-volumes.repository';
import { DatabaseVolumesRepository } from '../../../infrastructure/database/db-volumes.repository';
import { DockerVolumesRepository } from '../../../infrastructure/docker/docker-volumes.repository';
import { VolumesService } from '../volumes.service';

import { DatabaseServicesRepository } from '@features/services/infrastructure/database/db-services.repository';

jest.mock('../../../application/attach-volume.use-case');
jest.mock('../../../application/create-volume.use-case');
jest.mock('../../../application/detach-volume.use-case');
jest.mock('../../../application/get-volumes-by-service.use-case');
jest.mock('../../../application/rename-volume.use-case');

const mockAttachVolumeUseCase = attachVolumeUseCase as jest.MockedFunction<typeof attachVolumeUseCase>;
const mockCreateVolumeUseCase = createVolumeUseCase as jest.MockedFunction<typeof createVolumeUseCase>;
const mockDetachVolumeUseCase = detachVolumeUseCase as jest.MockedFunction<typeof detachVolumeUseCase>;
const mockGetVolumesByServiceUseCase = getVolumesByServiceUseCase as jest.MockedFunction<
    typeof getVolumesByServiceUseCase
>;
const mockRenameVolumeUseCase = renameVolumeUseCase as jest.MockedFunction<typeof renameVolumeUseCase>;

const serviceId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
const volumeId = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';

const volume: VolumeStatus = {
    id: volumeId,
    name: 'data',
    daemonName: `api_gitpaas-${volumeId}`,
    origin: 'gitpaas',
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

    describe('create', () => {
        const createDto: CreateVolumeDto = {
            name: 'data', composeServiceName: 'app', containerPath: '/data', readOnly: false,
        };

        it('sends the repositories of the database, the service and the body to the use case', async () => {
            mockCreateVolumeUseCase.mockResolvedValue(volume);

            await sut.create(serviceId, createDto);

            expect(mockCreateVolumeUseCase).toHaveBeenCalledWith(
                mockServicesRepository,
                mockVolumesRepository,
                mockServiceVolumesRepository,
                serviceId,
                createDto,
            );
        });

        it('gives the created volume back', async () => {
            mockCreateVolumeUseCase.mockResolvedValue(volume);

            await expect(sut.create(serviceId, createDto)).resolves.toBe(volume);
        });
    });

    describe('rename', () => {
        const updateDto: UpdateVolumeDto = { name: 'archive' };

        it('sends the identifier of the volume and the body to the use case', async () => {
            mockRenameVolumeUseCase.mockResolvedValue(volume);

            await sut.rename(serviceId, volumeId, updateDto);

            expect(mockRenameVolumeUseCase).toHaveBeenCalledWith(
                mockServicesRepository,
                mockVolumesRepository,
                mockServiceVolumesRepository,
                mockDaemonVolumesRepository,
                serviceId,
                volumeId,
                updateDto,
            );
        });

        it('gives the renamed volume back', async () => {
            mockRenameVolumeUseCase.mockResolvedValue(volume);

            await expect(sut.rename(serviceId, volumeId, updateDto)).resolves.toBe(volume);
        });
    });

    describe('attach', () => {
        const attachDto: AttachVolumeDto = { composeServiceName: 'app', containerPath: '/data', readOnly: true };

        it('sends the two repositories of the database and the body to the use case', async () => {
            mockAttachVolumeUseCase.mockResolvedValue();

            await sut.attach(serviceId, volumeId, attachDto);

            expect(mockAttachVolumeUseCase).toHaveBeenCalledWith(
                mockVolumesRepository,
                mockServiceVolumesRepository,
                serviceId,
                volumeId,
                attachDto,
            );
        });

        it('gives nothing back', async () => {
            mockAttachVolumeUseCase.mockResolvedValue();

            await expect(sut.attach(serviceId, volumeId, attachDto)).resolves.toBeUndefined();
        });
    });

    describe('detach', () => {
        it('sends the two repositories of the database and the identifiers to the use case', async () => {
            mockDetachVolumeUseCase.mockResolvedValue();

            await sut.detach(serviceId, volumeId);

            expect(mockDetachVolumeUseCase).toHaveBeenCalledWith(
                mockVolumesRepository,
                mockServiceVolumesRepository,
                serviceId,
                volumeId,
            );
        });

        it('propagates the error of the use case', async () => {
            const error = new Error('not attached');

            mockDetachVolumeUseCase.mockRejectedValue(error);

            await expect(sut.detach(serviceId, volumeId)).rejects.toThrow(error);
        });
    });
});
