import type { AttachVolumeDto, CreateVolumeDto, UpdateVolumeDto } from '@gitpaas/contracts';
import { ConflictException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { VolumeMountPathTakenError, VolumeNotFoundError } from '../../../domain/errors/volume.errors';
import { VolumeStatus } from '../../../domain/models/volume.models';
import { VolumesService } from '../../services/volumes.service';
import { VolumesController } from '../volumes.controller';

import { ServiceNotFoundError } from '@features/services/domain/errors/service.errors';

const serviceId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
const volumeId = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';

const volume: VolumeStatus = {
    id: volumeId,
    name: 'data',
    daemonName: `api_gitpaas-${volumeId}`,
    origin: 'gitpaas',
    state: 'pending',
    driver: 'local',
    mountpoint: '/var/lib/docker/volumes/api_data/_data',
    mount: { composeServiceName: 'app', containerPath: '/data', readOnly: false },
    containers: [],
};

const createDto: CreateVolumeDto = {
    name: 'data', composeServiceName: 'app', containerPath: '/data', readOnly: false,
};
const updateDto: UpdateVolumeDto = { name: 'archive' };
const attachDto: AttachVolumeDto = { composeServiceName: 'app', containerPath: '/data', readOnly: false };

describe('VolumesController', () => {
    let mockVolumesService: jest.Mocked<
        Pick<VolumesService, 'getByService' | 'create' | 'rename' | 'attach' | 'detach'>
    >;
    let sut: VolumesController;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockVolumesService = {
            getByService: jest.fn(),
            create: jest.fn(),
            rename: jest.fn(),
            attach: jest.fn(),
            detach: jest.fn(),
        };

        const moduleRef = await Test.createTestingModule({
            controllers: [VolumesController],
            providers: [{ provide: VolumesService, useValue: mockVolumesService }],
        }).compile();

        sut = moduleRef.get(VolumesController);
    });

    describe('getByService', () => {
        it('delegates the read to the service', async () => {
            mockVolumesService.getByService.mockResolvedValue([]);

            await sut.getByService(serviceId);

            expect(mockVolumesService.getByService).toHaveBeenCalledTimes(1);
            expect(mockVolumesService.getByService).toHaveBeenCalledWith(serviceId);
        });

        it('maps every volume into the shape of the wire', async () => {
            mockVolumesService.getByService.mockResolvedValue([volume]);

            await expect(sut.getByService(serviceId)).resolves.toEqual([
                {
                    id: volumeId,
                    name: 'data',
                    daemonName: `api_gitpaas-${volumeId}`,
                    origin: 'gitpaas',
                    state: 'pending',
                    driver: 'local',
                    mountpoint: '/var/lib/docker/volumes/api_data/_data',
                    mount: { composeServiceName: 'app', containerPath: '/data', readOnly: false },
                    containers: [],
                },
            ]);
        });

        it('gives an empty list when the service holds no volume', async () => {
            mockVolumesService.getByService.mockResolvedValue([]);

            await expect(sut.getByService(serviceId)).resolves.toEqual([]);
        });

        it('turns an absent service into a 404', async () => {
            mockVolumesService.getByService.mockRejectedValue(new ServiceNotFoundError(serviceId));

            await expect(sut.getByService(serviceId)).rejects.toBeInstanceOf(NotFoundException);
        });

        it('turns a failure of the daemon into a 503', async () => {
            mockVolumesService.getByService.mockRejectedValue(new Error('connect ENOENT /var/run/docker.sock'));

            await expect(sut.getByService(serviceId)).rejects.toBeInstanceOf(ServiceUnavailableException);
        });
    });

    describe('create', () => {
        it('delegates the creation to the service', async () => {
            mockVolumesService.create.mockResolvedValue(volume);

            await sut.create(serviceId, createDto);

            expect(mockVolumesService.create).toHaveBeenCalledTimes(1);
            expect(mockVolumesService.create).toHaveBeenCalledWith(serviceId, createDto);
        });

        it('gives the created volume in the shape of the wire', async () => {
            mockVolumesService.create.mockResolvedValue(volume);

            await expect(sut.create(serviceId, createDto)).resolves.toEqual(expect.objectContaining({
                id: volumeId, state: 'pending',
            }));
        });

        it('turns a mount path that another volume holds into a 409', async () => {
            mockVolumesService.create.mockRejectedValue(new VolumeMountPathTakenError('/data'));

            await expect(sut.create(serviceId, createDto)).rejects.toBeInstanceOf(ConflictException);
        });

        it('propagates an error that no translation covers', async () => {
            const error = new Error('boom');

            mockVolumesService.create.mockRejectedValue(error);

            await expect(sut.create(serviceId, createDto)).rejects.toBe(error);
        });
    });

    describe('rename', () => {
        it('delegates the rename to the service', async () => {
            mockVolumesService.rename.mockResolvedValue(volume);

            await sut.rename(serviceId, volumeId, updateDto);

            expect(mockVolumesService.rename).toHaveBeenCalledWith(serviceId, volumeId, updateDto);
        });

        it('turns an absent volume into a 404', async () => {
            mockVolumesService.rename.mockRejectedValue(new VolumeNotFoundError(volumeId));

            await expect(sut.rename(serviceId, volumeId, updateDto)).rejects.toBeInstanceOf(NotFoundException);
        });
    });

    describe('attach', () => {
        it('delegates the attach to the service', async () => {
            mockVolumesService.attach.mockResolvedValue();

            await sut.attach(serviceId, volumeId, attachDto);

            expect(mockVolumesService.attach).toHaveBeenCalledWith(serviceId, volumeId, attachDto);
        });

        it('gives no content back', async () => {
            mockVolumesService.attach.mockResolvedValue();

            await expect(sut.attach(serviceId, volumeId, attachDto)).resolves.toBeUndefined();
        });

        it('turns an absent volume into a 404', async () => {
            mockVolumesService.attach.mockRejectedValue(new VolumeNotFoundError(volumeId));

            await expect(sut.attach(serviceId, volumeId, attachDto)).rejects.toBeInstanceOf(NotFoundException);
        });
    });

    describe('detach', () => {
        it('delegates the detach to the service', async () => {
            mockVolumesService.detach.mockResolvedValue();

            await sut.detach(serviceId, volumeId);

            expect(mockVolumesService.detach).toHaveBeenCalledWith(serviceId, volumeId);
        });

        it('gives no content back', async () => {
            mockVolumesService.detach.mockResolvedValue();

            await expect(sut.detach(serviceId, volumeId)).resolves.toBeUndefined();
        });

        it('names the volume in the message of the 404', async () => {
            mockVolumesService.detach.mockRejectedValue(new VolumeNotFoundError(volumeId));

            await expect(sut.detach(serviceId, volumeId)).rejects.toThrow(`Volume ${volumeId} not found`);
        });
    });
});
