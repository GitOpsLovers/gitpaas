import { UpdateNamespaceDto } from '../../domain/dtos/update-namespace.dto';
import { Namespace } from '../../domain/models/namespace.models';
import { NamespacesRepository } from '../../domain/repositories/namespaces.repository';
import { updateNamespaceUseCase } from '../update-namespace.use-case';

describe('updateNamespaceUseCase', () => {
    const id = '9c858901-8a57-4791-81fe-4c455b099bc9';
    const updateDto: UpdateNamespaceDto = { name: 'renamed' };

    const updatedNamespace: Namespace = { id, name: updateDto.name };

    let mockNamespacesRepository: jest.Mocked<Pick<NamespacesRepository, 'update'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockNamespacesRepository = {
            update: jest.fn(),
        };
    });

    it('delegates the update to the repository with the provided id and DTO', async () => {
        mockNamespacesRepository.update.mockResolvedValue(updatedNamespace);

        await updateNamespaceUseCase(mockNamespacesRepository as unknown as NamespacesRepository, id, updateDto);

        expect(mockNamespacesRepository.update).toHaveBeenCalledTimes(1);
        expect(mockNamespacesRepository.update).toHaveBeenCalledWith(id, updateDto);
    });

    it('returns the namespace updated by the repository', async () => {
        mockNamespacesRepository.update.mockResolvedValue(updatedNamespace);

        const result = await updateNamespaceUseCase(
            mockNamespacesRepository as unknown as NamespacesRepository,
            id,
            updateDto,
        );

        expect(result).toBe(updatedNamespace);
    });

    it('returns null when the namespace does not exist', async () => {
        mockNamespacesRepository.update.mockResolvedValue(null);

        const result = await updateNamespaceUseCase(
            mockNamespacesRepository as unknown as NamespacesRepository,
            id,
            updateDto,
        );

        expect(result).toBeNull();
    });

    it('propagates errors thrown by the repository', async () => {
        const error = new Error('database unavailable');
        mockNamespacesRepository.update.mockRejectedValue(error);

        await expect(
            updateNamespaceUseCase(mockNamespacesRepository as unknown as NamespacesRepository, id, updateDto),
        ).rejects.toThrow(error);
    });
});
