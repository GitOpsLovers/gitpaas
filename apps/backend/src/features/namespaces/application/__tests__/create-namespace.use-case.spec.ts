import { CreateNamespaceDto } from '../../domain/dtos/create-namespace.dto';
import { Namespace } from '../../domain/models/namespace.models';
import { NamespacesRepository } from '../../domain/repositories/namespaces.repository';
import { createNamespaceUseCase } from '../create-namespace.use-case';

describe('createNamespaceUseCase', () => {
    const createDto: CreateNamespaceDto = { name: 'platform' };

    const createdNamespace: Namespace = {
        id: '9c858901-8a57-4791-81fe-4c455b099bc9',
        name: createDto.name,
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

    it('propagates errors thrown by the repository', async () => {
        const error = new Error('database unavailable');
        mockNamespacesRepository.create.mockRejectedValue(error);

        await expect(
            createNamespaceUseCase(mockNamespacesRepository as unknown as NamespacesRepository, createDto),
        ).rejects.toThrow(error);
    });
});
