import type { CreateNamespaceDto } from '@gitpaas/contracts';

import { Namespace } from '../../domain/models/namespace.models';
import { NamespacesRepository } from '../../domain/repositories/namespaces.repository';
import { createNamespaceUseCase } from '../create-namespace.use-case';

describe('createNamespaceUseCase', () => {
    const createDto: CreateNamespaceDto = { name: 'platform', description: 'The control plane' };

    const createdNamespace: Namespace = {
        id: '9c858901-8a57-4791-81fe-4c455b099bc9',
        name: createDto.name,
        description: 'The control plane',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    let mockNamespacesRepository: jest.Mocked<Pick<NamespacesRepository, 'create'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockNamespacesRepository = {
            create: jest.fn(),
        };
    });

    it('delegates creation to the repository with the provided DTO', async () => {
        mockNamespacesRepository.create.mockResolvedValue(createdNamespace);

        await createNamespaceUseCase(mockNamespacesRepository as unknown as NamespacesRepository, createDto);

        expect(mockNamespacesRepository.create).toHaveBeenCalledTimes(1);
        expect(mockNamespacesRepository.create).toHaveBeenCalledWith(createDto);
    });

    it('returns the namespace created by the repository', async () => {
        mockNamespacesRepository.create.mockResolvedValue(createdNamespace);

        const result = await createNamespaceUseCase(
            mockNamespacesRepository as unknown as NamespacesRepository,
            createDto,
        );

        expect(result).toBe(createdNamespace);
    });

    it('hands the description of the DTO to the repository', async () => {
        mockNamespacesRepository.create.mockResolvedValue(createdNamespace);

        await createNamespaceUseCase(mockNamespacesRepository as unknown as NamespacesRepository, createDto);

        expect(mockNamespacesRepository.create).toHaveBeenCalledWith(
            expect.objectContaining({ description: 'The control plane' }),
        );
    });

    it('delegates a DTO that carries the name alone, with no description invented', async () => {
        mockNamespacesRepository.create.mockResolvedValue(createdNamespace);

        await createNamespaceUseCase(mockNamespacesRepository as unknown as NamespacesRepository, {
            name: 'platform',
        });

        expect(mockNamespacesRepository.create).toHaveBeenCalledWith({ name: 'platform' });
    });

    it('returns the description and the date of creation the repository answered', async () => {
        mockNamespacesRepository.create.mockResolvedValue(createdNamespace);

        const result = await createNamespaceUseCase(
            mockNamespacesRepository as unknown as NamespacesRepository,
            createDto,
        );

        expect(result).toMatchObject({
            description: 'The control plane',
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
        });
    });

    it('propagates errors thrown by the repository', async () => {
        const error = new Error('database unavailable');
        mockNamespacesRepository.create.mockRejectedValue(error);

        await expect(
            createNamespaceUseCase(mockNamespacesRepository as unknown as NamespacesRepository, createDto),
        ).rejects.toThrow(error);
    });

    it('delegates a name that holds an uppercase letter and a space, because the daemon receives a normalized name', async () => {
        mockNamespacesRepository.create.mockResolvedValue(createdNamespace);

        await createNamespaceUseCase(mockNamespacesRepository as unknown as NamespacesRepository, {
            ...createDto,
            name: 'My Platform',
        });

        expect(mockNamespacesRepository.create).toHaveBeenCalledWith({ ...createDto, name: 'My Platform' });
    });
});
