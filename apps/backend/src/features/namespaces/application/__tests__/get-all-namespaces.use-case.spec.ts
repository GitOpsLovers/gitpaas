import { Namespace } from '../../domain/models/namespace.models';
import { NamespacesRepository } from '../../domain/repositories/namespaces.repository';
import { getAllNamespacesUseCase } from '../get-all-namespaces.use-case';

describe('getAllNamespacesUseCase', () => {
    const namespaces: Namespace[] = [
        { id: '9c858901-8a57-4791-81fe-4c455b099bc9', name: 'default' },
    ];

    let mockNamespacesRepository: jest.Mocked<Pick<NamespacesRepository, 'getAll'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockNamespacesRepository = {
            getAll: jest.fn(),
        };
    });

    it('delegates the lookup to the repository', async () => {
        mockNamespacesRepository.getAll.mockResolvedValue(namespaces);

        await getAllNamespacesUseCase(mockNamespacesRepository as unknown as NamespacesRepository);

        expect(mockNamespacesRepository.getAll).toHaveBeenCalledTimes(1);
    });

    it('returns the namespaces listed by the repository', async () => {
        mockNamespacesRepository.getAll.mockResolvedValue(namespaces);

        const result = await getAllNamespacesUseCase(mockNamespacesRepository as unknown as NamespacesRepository);

        expect(result).toBe(namespaces);
    });

    it('returns an empty list when there are no namespaces', async () => {
        mockNamespacesRepository.getAll.mockResolvedValue([]);

        const result = await getAllNamespacesUseCase(mockNamespacesRepository as unknown as NamespacesRepository);

        expect(result).toEqual([]);
    });

    it('propagates errors thrown by the repository', async () => {
        const error = new Error('database unavailable');
        mockNamespacesRepository.getAll.mockRejectedValue(error);

        await expect(
            getAllNamespacesUseCase(mockNamespacesRepository as unknown as NamespacesRepository),
        ).rejects.toThrow(error);
    });
});
