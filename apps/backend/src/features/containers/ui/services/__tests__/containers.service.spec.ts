import { NotFoundException } from '@nestjs/common';

import { Container } from '../../../domain/models/container.model';
import { DockerContainersRepository } from '../../../infrastructure/docker/docker-containers.repository';
import { ContainersService } from '../containers.service';

import { Service } from '@features/services/domain/models/service.model';
import { ServicesDatabaseRepository } from '@features/services/infrastructure/database/services-db.repository';

const serviceId = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

const service: Service = {
    id: serviceId,
    name: 'web-frontend',
    projectId: 'b2a2132b-d6b7-464a-8aaf-c659a3ca0d60',
    repositoryId: '42',
    deploymentBranch: 'main',
    composerPath: 'docker-compose.yml',
};

const containers: Container[] = [
    {
        id: 'a1b2c3d4e5f6',
        name: 'web-frontend-app-1',
        image: 'web-frontend_app',
        state: 'running',
        status: 'Up 3 minutes',
        createdAt: new Date('2026-07-11T00:00:00.000Z'),
        ports: [{ privatePort: 3000, publicPort: 8080, type: 'tcp' }],
    },
];

describe('ContainersService', () => {
    let servicesRepository: jest.Mocked<Pick<ServicesDatabaseRepository, 'findById'>>;
    let containersRepository: jest.Mocked<Pick<DockerContainersRepository, 'listByService'>>;
    let sut: ContainersService;

    beforeEach(() => {
        servicesRepository = { findById: jest.fn() };
        containersRepository = { listByService: jest.fn() };

        sut = new ContainersService(
            servicesRepository as unknown as ServicesDatabaseRepository,
            containersRepository as unknown as DockerContainersRepository,
        );
    });

    describe('getByService', () => {
        it('looks the service up by its id before listing containers', async () => {
            servicesRepository.findById.mockResolvedValue(service);
            containersRepository.listByService.mockResolvedValue(containers);

            await sut.getByService(serviceId);

            expect(servicesRepository.findById).toHaveBeenCalledTimes(1);
            expect(servicesRepository.findById).toHaveBeenCalledWith(serviceId);
        });

        it('delegates to the containers repository with the resolved service', async () => {
            servicesRepository.findById.mockResolvedValue(service);
            containersRepository.listByService.mockResolvedValue(containers);

            await sut.getByService(serviceId);

            expect(containersRepository.listByService).toHaveBeenCalledTimes(1);
            expect(containersRepository.listByService).toHaveBeenCalledWith(service);
        });

        it('returns the containers produced by the repository', async () => {
            servicesRepository.findById.mockResolvedValue(service);
            containersRepository.listByService.mockResolvedValue(containers);

            const result = await sut.getByService(serviceId);

            expect(result).toBe(containers);
        });

        it('returns an empty list when the service has no containers', async () => {
            servicesRepository.findById.mockResolvedValue(service);
            containersRepository.listByService.mockResolvedValue([]);

            const result = await sut.getByService(serviceId);

            expect(result).toEqual([]);
        });

        it('throws NotFoundException when the service does not exist', async () => {
            servicesRepository.findById.mockResolvedValue(null);

            await expect(sut.getByService(serviceId)).rejects.toThrow(NotFoundException);
            await expect(sut.getByService(serviceId)).rejects.toThrow(`Service ${serviceId} not found`);
        });

        it('never queries the containers repository when the service is missing', async () => {
            servicesRepository.findById.mockResolvedValue(null);

            await expect(sut.getByService(serviceId)).rejects.toThrow(NotFoundException);
            expect(containersRepository.listByService).not.toHaveBeenCalled();
        });

        it('propagates errors thrown while resolving the service', async () => {
            const error = new Error('db unreachable');
            servicesRepository.findById.mockRejectedValue(error);

            await expect(sut.getByService(serviceId)).rejects.toThrow(error);
            expect(containersRepository.listByService).not.toHaveBeenCalled();
        });

        it('propagates errors thrown while listing the containers', async () => {
            const error = new Error('daemon unreachable');
            servicesRepository.findById.mockResolvedValue(service);
            containersRepository.listByService.mockRejectedValue(error);

            await expect(sut.getByService(serviceId)).rejects.toThrow(error);
        });
    });
});
