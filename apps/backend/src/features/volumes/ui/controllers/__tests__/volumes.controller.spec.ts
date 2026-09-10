import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { VolumeStatus } from '../../../domain/models/volume.models';
import { VolumesService } from '../../services/volumes.service';
import { VolumesController } from '../volumes.controller';

import { DaemonUnreachableError } from '@core/domain/errors/container-runtime.errors';
import { ServiceNotFoundError } from '@features/services/domain/errors/service.errors';

const serviceId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
const volumeId = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';

const volume: VolumeStatus = {
    id: volumeId,
    name: 'data',
    daemonName: `api_gitpaas-${volumeId}`,
    state: 'pending',
    driver: 'local',
    mountpoint: '/var/lib/docker/volumes/api_data/_data',
    mount: { composeServiceName: 'app', containerPath: '/data', readOnly: false },
    containers: [],
};

describe('VolumesController', () => {
    let mockVolumesService: jest.Mocked<Pick<VolumesService, 'getByService'>>;
    let sut: VolumesController;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockVolumesService = { getByService: jest.fn() };

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
            mockVolumesService.getByService.mockRejectedValue(
                new DaemonUnreachableError({ cause: new Error('connect ENOENT /var/run/docker.sock') }),
            );

            await expect(sut.getByService(serviceId)).rejects.toBeInstanceOf(ServiceUnavailableException);
        });

        it('keeps the remediation message of the endpoint on that 503', async () => {
            mockVolumesService.getByService.mockRejectedValue(new DaemonUnreachableError());

            await expect(sut.getByService(serviceId)).rejects.toThrow(
                'Could not reach the server Docker daemon. Verify the server is running and reachable.',
            );
        });

        it('chains the failure of the daemon as the cause, so the envelope carries its code', async () => {
            const daemonFailure = new DaemonUnreachableError();
            mockVolumesService.getByService.mockRejectedValue(daemonFailure);

            const error = await sut.getByService(serviceId).catch((caught: unknown) => caught);

            expect((error as Error).cause).toBe(daemonFailure);
            expect(((error as Error).cause as DaemonUnreachableError).code).toBe('DAEMON_UNREACHABLE');
        });

        it('rethrows a failure of the database unchanged, so the client receives a 500', async () => {
            const original = new Error('database connection terminated');
            mockVolumesService.getByService.mockRejectedValue(original);

            await expect(sut.getByService(serviceId)).rejects.toBe(original);
        });
    });
});
