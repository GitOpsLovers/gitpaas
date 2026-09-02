import type { UpdateNamespaceDto } from '@gitpaas/contracts';

import { Namespace } from '../../domain/models/namespace.models';
import { NamespacesRepository } from '../../domain/repositories/namespaces.repository';
import { updateNamespaceUseCase } from '../update-namespace.use-case';

describe('updateNamespaceUseCase', () => {
    const id = '9c858901-8a57-4791-81fe-4c455b099bc9';
    const updateDto: UpdateNamespaceDto = { name: 'renamed', description: 'The renamed scope' };

    const updatedNamespace: Namespace = {
        id,
        name: 'renamed',
        description: 'The renamed scope',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
    };

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

    it('hands a DTO that carries the description alone to the repository', async () => {
        mockNamespacesRepository.update.mockResolvedValue(updatedNamespace);

        await updateNamespaceUseCase(mockNamespacesRepository as unknown as NamespacesRepository, id, {
            description: 'The renamed scope',
        });

        expect(mockNamespacesRepository.update).toHaveBeenCalledWith(id, {
            description: 'The renamed scope',
        });
    });

    it('returns the description and the date of creation the repository answered', async () => {
        mockNamespacesRepository.update.mockResolvedValue(updatedNamespace);

        const result = await updateNamespaceUseCase(
            mockNamespacesRepository as unknown as NamespacesRepository,
            id,
            updateDto,
        );

        expect(result).toMatchObject({
            description: 'The renamed scope',
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
        });
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
