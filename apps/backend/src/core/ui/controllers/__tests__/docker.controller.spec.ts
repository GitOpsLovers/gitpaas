import { ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { DockerInfo } from '../../../domain/models/docker.models';
import { DockerService } from '../../services/docker.service';
import { DockerController } from '../docker.controller';

const dockerInfo: DockerInfo = {
    ServerVersion: '27.1.1',
    OperatingSystem: 'Ubuntu 24.04',
    Containers: 4,
    Images: 12,
};

describe('DockerController', () => {
    let service: jest.Mocked<Pick<DockerService, 'info'>>;
    let sut: DockerController;

    beforeEach(async () => {
        service = {
            info: jest.fn(),
        };

        const moduleRef = await Test.createTestingModule({
            controllers: [DockerController],
            providers: [{ provide: DockerService, useValue: service }],
        }).compile();

        sut = moduleRef.get(DockerController);
    });

    describe('getStatus', () => {
        it('delegates to the service to fetch the daemon info', async () => {
            service.info.mockResolvedValue(dockerInfo);

            await sut.getStatus();

            expect(service.info).toHaveBeenCalledTimes(1);
        });

        it('maps the daemon info into a connected status payload', async () => {
            service.info.mockResolvedValue(dockerInfo);

            const result = await sut.getStatus();

            expect(result).toEqual({
                connected: true,
                serverVersion: dockerInfo.ServerVersion,
                operatingSystem: dockerInfo.OperatingSystem,
                containers: dockerInfo.Containers,
                images: dockerInfo.Images,
            });
        });

        it('reflects zeroed counts and empty strings from the daemon info', async () => {
            service.info.mockResolvedValue({
                ServerVersion: '',
                OperatingSystem: '',
                Containers: 0,
                Images: 0,
            });

            const result = await sut.getStatus();

            expect(result).toEqual({
                connected: true,
                serverVersion: '',
                operatingSystem: '',
                containers: 0,
                images: 0,
            });
        });

        it('rethrows a ServiceUnavailableException raised by the service unchanged', async () => {
            const original = new ServiceUnavailableException('daemon down');
            service.info.mockRejectedValue(original);

            await expect(sut.getStatus()).rejects.toBe(original);
        });

        it('wraps an unexpected error into a ServiceUnavailableException', async () => {
            service.info.mockRejectedValue(new Error('ECONNREFUSED'));

            await expect(sut.getStatus()).rejects.toBeInstanceOf(ServiceUnavailableException);
        });

        it('includes remediation guidance in the wrapped error message', async () => {
            service.info.mockRejectedValue(new Error('ECONNREFUSED'));

            await expect(sut.getStatus()).rejects.toThrow(/Could not reach the VPS Docker daemon/);
        });

        it('wraps non-Error rejection values into a ServiceUnavailableException', async () => {
            service.info.mockRejectedValue('boom');

            await expect(sut.getStatus()).rejects.toBeInstanceOf(ServiceUnavailableException);
        });
    });
});
