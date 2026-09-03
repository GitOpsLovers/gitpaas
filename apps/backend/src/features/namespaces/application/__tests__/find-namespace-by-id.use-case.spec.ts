import { Namespace } from '../../domain/models/namespace.models';
import { NamespacesRepository } from '../../domain/repositories/namespaces.repository';
import { findNamespaceByIdUseCase } from '../find-namespace-by-id.use-case';

describe('findNamespaceByIdUseCase', () => {
    const id = '9c858901-8a57-4791-81fe-4c455b099bc9';

    const namespace: Namespace = {
        id,
        name: 'default',
        description: 'The scope by default',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    let mockNamespacesRepository: jest.Mocked<Pick<NamespacesRepository, 'findById'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockNamespacesRepository = {
            findById: jest.fn(),
        };
    });

    it('delegates the lookup to the repository with the provided id', async () => {
        mockNamespacesRepository.findById.mockResolvedValue(namespace);

        await findNamespaceByIdUseCase(mockNamespacesRepository as unknown as NamespacesRepository, id);

        expect(mockNamespacesRepository.findById).toHaveBeenCalledTimes(1);
        expect(mockNamespacesRepository.findById).toHaveBeenCalledWith(id);
    });

    it('returns the namespace found by the repository', async () => {
        mockNamespacesRepository.findById.mockResolvedValue(namespace);

        const result = await findNamespaceByIdUseCase(mockNamespacesRepository as unknown as NamespacesRepository, id);

        expect(result).toBe(namespace);
    });

    it('returns null when the namespace does not exist', async () => {
        mockNamespacesRepository.findById.mockResolvedValue(null);

        const result = await findNamespaceByIdUseCase(mockNamespacesRepository as unknown as NamespacesRepository, id);

        expect(result).toBeNull();
    });

    it('propagates errors thrown by the repository', async () => {
        const error = new Error('database unavailable');
        mockNamespacesRepository.findById.mockRejectedValue(error);

        await expect(
            findNamespaceByIdUseCase(mockNamespacesRepository as unknown as NamespacesRepository, id),
        ).rejects.toThrow(error);
    });
});
