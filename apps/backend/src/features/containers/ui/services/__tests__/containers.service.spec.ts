import { Test } from '@nestjs/testing';

import { getContainersByServiceUseCase } from '../../../application/get-containers-by-service.use-case';
import { Container } from '../../../domain/models/container.models';
import { DockerContainersRepository } from '../../../infrastructure/docker/docker-containers.repository';
import { ContainersService } from '../containers.service';

import { ServiceNotFoundError } from '@features/services/domain/errors/service.errors';
import { DatabaseServicesRepository } from '@features/services/infrastructure/database/db-services.repository';

jest.mock('../../../application/get-containers-by-service.use-case');

const mockGetContainersByServiceUseCase = getContainersByServiceUseCase as jest.MockedFunction<
    typeof getContainersByServiceUseCase
>;

const serviceId = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

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
    let mockServicesRepository: jest.Mocked<Pick<DatabaseServicesRepository, 'findById'>>;
    let mockContainersRepository: jest.Mocked<Pick<DockerContainersRepository, 'listByService'>>;
    let sut: ContainersService;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockServicesRepository = { findById: jest.fn() };
        mockContainersRepository = { listByService: jest.fn() };

        const moduleRef = await Test.createTestingModule({
            providers: [
                ContainersService,
                { provide: DatabaseServicesRepository, useValue: mockServicesRepository },
                { provide: DockerContainersRepository, useValue: mockContainersRepository },
            ],
        }).compile();

        sut = moduleRef.get(ContainersService);
    });

    describe('getByService', () => {
        it('delegates to the use case with both repositories and the service id', async () => {
            mockGetContainersByServiceUseCase.mockResolvedValue(containers);

            await sut.getByService(serviceId);

            expect(mockGetContainersByServiceUseCase).toHaveBeenCalledTimes(1);
            expect(mockGetContainersByServiceUseCase).toHaveBeenCalledWith(
                mockServicesRepository,
                mockContainersRepository,
                serviceId,
            );
        });

        it('returns the containers produced by the use case', async () => {
            mockGetContainersByServiceUseCase.mockResolvedValue(containers);

            const result = await sut.getByService(serviceId);

            expect(result).toBe(containers);
        });

        it('returns an empty list when the service has no containers', async () => {
            mockGetContainersByServiceUseCase.mockResolvedValue([]);

            const result = await sut.getByService(serviceId);

            expect(result).toEqual([]);
        });

        it('propagates the ServiceNotFoundError raised by the use case untranslated', async () => {
            mockGetContainersByServiceUseCase.mockRejectedValue(new ServiceNotFoundError(serviceId));

            await expect(sut.getByService(serviceId)).rejects.toThrow(ServiceNotFoundError);
        });

        it('propagates any other error raised by the use case', async () => {
            const error = new Error('daemon unreachable');
            mockGetContainersByServiceUseCase.mockRejectedValue(error);

            await expect(sut.getByService(serviceId)).rejects.toThrow(error);
        });
    });
});
