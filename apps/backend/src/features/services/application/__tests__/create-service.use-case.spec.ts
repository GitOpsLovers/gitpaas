import type { CreateServiceDto } from '@gitpaas/contracts';

import { Service } from '../../domain/models/service.models';
import { ServicesRepository } from '../../domain/repositories/services.repository';
import { createServiceUseCase } from '../create-service.use-case';

describe('createServiceUseCase', () => {
    const providerId = 'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f';

    const createDto: CreateServiceDto = {
        name: 'api',
        description: 'The gateway of the API',
        projectId: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
        providerId,
    };

    const createdService: Service = {
        id: '9c858901-8a57-4791-81fe-4c455b099bc9',
        name: createDto.name,
        description: 'The gateway of the API',
        projectId: createDto.projectId,
        providerId,
        repositoryId: '42',
        deploymentBranch: 'main',
        composerPath: 'docker-compose.yml',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    let mockServicesRepository: jest.Mocked<Pick<ServicesRepository, 'create'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockServicesRepository = {
            create: jest.fn(),
        };
    });

    it('delegates creation to the repository with the provided DTO', async () => {
        mockServicesRepository.create.mockResolvedValue(createdService);

        await createServiceUseCase(mockServicesRepository as unknown as ServicesRepository, createDto);

        expect(mockServicesRepository.create).toHaveBeenCalledTimes(1);
        expect(mockServicesRepository.create).toHaveBeenCalledWith(createDto);
    });

    it('returns the service created by the repository', async () => {
        mockServicesRepository.create.mockResolvedValue(createdService);

        const result = await createServiceUseCase(mockServicesRepository as unknown as ServicesRepository, createDto);

        expect(result).toBe(createdService);
    });

    it('delegates a DTO that names no provider unchanged, and returns the service with a null provider', async () => {
        const dtoWithoutProvider: CreateServiceDto = { name: createDto.name, projectId: createDto.projectId };
        const serviceWithoutProvider: Service = { ...createdService, providerId: null };
        mockServicesRepository.create.mockResolvedValue(serviceWithoutProvider);

        const result = await createServiceUseCase(
            mockServicesRepository as unknown as ServicesRepository,
            dtoWithoutProvider,
        );

        expect(mockServicesRepository.create).toHaveBeenCalledWith(dtoWithoutProvider);
        expect(result.providerId).toBeNull();
    });

    it('propagates errors thrown by the repository', async () => {
        const error = new Error('database unavailable');
        mockServicesRepository.create.mockRejectedValue(error);

        await expect(
            createServiceUseCase(mockServicesRepository as unknown as ServicesRepository, createDto),
        ).rejects.toThrow(error);
    });
});
