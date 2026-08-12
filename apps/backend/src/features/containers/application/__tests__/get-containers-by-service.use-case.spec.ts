import { HttpException } from '@nestjs/common';

import { Container } from '../../domain/models/container.models';
import { ContainersRepository } from '../../domain/repositories/containers.repository';
import { getContainersByServiceUseCase } from '../get-containers-by-service.use-case';

import { ServiceNotFoundError } from '@features/services/domain/errors/service.errors';
import { Service } from '@features/services/domain/models/service.models';
import { ServicesRepository } from '@features/services/domain/repositories/services.repository';

describe('getContainersByServiceUseCase', () => {
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

    let mockServicesRepository: jest.Mocked<Pick<ServicesRepository, 'findById'>>;
    let mockContainersRepository: jest.Mocked<Pick<ContainersRepository, 'listByService'>>;

    /** Runs the use case with the mocked repositories. */
    const run = (id = serviceId): Promise<Container[]> => getContainersByServiceUseCase(
        mockServicesRepository as unknown as ServicesRepository,
        mockContainersRepository,
        id,
    );

    beforeEach(() => {
        jest.clearAllMocks();

        mockServicesRepository = { findById: jest.fn().mockResolvedValue(service) };
        mockContainersRepository = { listByService: jest.fn().mockResolvedValue(containers) };
    });

    it('resolves the service by its identifier before listing containers', async () => {
        await run();

        expect(mockServicesRepository.findById).toHaveBeenCalledTimes(1);
        expect(mockServicesRepository.findById).toHaveBeenCalledWith(serviceId);
    });

    it('delegates the lookup to the repository with the resolved service', async () => {
        await run();

        expect(mockContainersRepository.listByService).toHaveBeenCalledTimes(1);
        expect(mockContainersRepository.listByService).toHaveBeenCalledWith(service);
    });

    it('returns the containers found by the repository', async () => {
        const result = await run();

        expect(result).toBe(containers);
    });

    it('returns an empty list when the service has no containers', async () => {
        mockContainersRepository.listByService.mockResolvedValue([]);

        await expect(run()).resolves.toEqual([]);
    });

    it('throws ServiceNotFoundError when the service does not exist', async () => {
        mockServicesRepository.findById.mockResolvedValue(null);

        await expect(run()).rejects.toThrow(ServiceNotFoundError);
        await expect(run()).rejects.toThrow(`Service ${serviceId} not found`);
    });

    it('never raises an HTTP exception when the service is missing, leaving that to the controller', async () => {
        mockServicesRepository.findById.mockResolvedValue(null);

        await expect(run()).rejects.not.toBeInstanceOf(HttpException);
    });

    it('never lists containers when the service is missing', async () => {
        mockServicesRepository.findById.mockResolvedValue(null);

        await expect(run()).rejects.toThrow(ServiceNotFoundError);
        expect(mockContainersRepository.listByService).not.toHaveBeenCalled();
    });

    it('propagates errors thrown while resolving the service', async () => {
        const error = new Error('db unreachable');
        mockServicesRepository.findById.mockRejectedValue(error);

        await expect(run()).rejects.toThrow(error);
        expect(mockContainersRepository.listByService).not.toHaveBeenCalled();
    });

    it('propagates errors thrown by the containers repository', async () => {
        const error = new Error('daemon unreachable');
        mockContainersRepository.listByService.mockRejectedValue(error);

        await expect(run()).rejects.toThrow(error);
    });
});
