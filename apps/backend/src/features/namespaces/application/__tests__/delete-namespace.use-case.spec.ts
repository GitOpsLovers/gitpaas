import { NamespaceNotEmptyError } from '../../domain/errors/namespace.errors';
import { NamespacesRepository } from '../../domain/repositories/namespaces.repository';
import { deleteNamespaceUseCase } from '../delete-namespace.use-case';

describe('deleteNamespaceUseCase', () => {
    const id = '9c858901-8a57-4791-81fe-4c455b099bc9';

    let mockNamespacesRepository: jest.Mocked<Pick<NamespacesRepository, 'countProjects' | 'delete'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockNamespacesRepository = {
            countProjects: jest.fn(),
            delete: jest.fn(),
        };
    });

    describe('when the namespace is empty', () => {
        it('counts the projects of the namespace before deleting it', async () => {
            mockNamespacesRepository.countProjects.mockResolvedValue(0);
            mockNamespacesRepository.delete.mockResolvedValue(true);

            await deleteNamespaceUseCase(mockNamespacesRepository as unknown as NamespacesRepository, id);

            expect(mockNamespacesRepository.countProjects).toHaveBeenCalledTimes(1);
            expect(mockNamespacesRepository.countProjects).toHaveBeenCalledWith(id);
        });

        it('delegates deletion to the repository with the provided id', async () => {
            mockNamespacesRepository.countProjects.mockResolvedValue(0);
            mockNamespacesRepository.delete.mockResolvedValue(true);

            await deleteNamespaceUseCase(mockNamespacesRepository as unknown as NamespacesRepository, id);

            expect(mockNamespacesRepository.delete).toHaveBeenCalledTimes(1);
            expect(mockNamespacesRepository.delete).toHaveBeenCalledWith(id);
        });

        it('returns true when the repository deletes a row', async () => {
            mockNamespacesRepository.countProjects.mockResolvedValue(0);
            mockNamespacesRepository.delete.mockResolvedValue(true);

            const result = await deleteNamespaceUseCase(
                mockNamespacesRepository as unknown as NamespacesRepository,
                id,
            );

            expect(result).toBe(true);
        });

        it('returns false when the repository deletes nothing', async () => {
            mockNamespacesRepository.countProjects.mockResolvedValue(0);
            mockNamespacesRepository.delete.mockResolvedValue(false);

            const result = await deleteNamespaceUseCase(
                mockNamespacesRepository as unknown as NamespacesRepository,
                id,
            );

            expect(result).toBe(false);
        });

        it('propagates errors thrown by the repository', async () => {
            const error = new Error('database unavailable');
            mockNamespacesRepository.countProjects.mockResolvedValue(0);
            mockNamespacesRepository.delete.mockRejectedValue(error);

            await expect(
                deleteNamespaceUseCase(mockNamespacesRepository as unknown as NamespacesRepository, id),
            ).rejects.toThrow(error);
        });

        it('propagates errors thrown by the count', async () => {
            const error = new Error('database unavailable');
            mockNamespacesRepository.countProjects.mockRejectedValue(error);

            await expect(
                deleteNamespaceUseCase(mockNamespacesRepository as unknown as NamespacesRepository, id),
            ).rejects.toThrow(error);
            expect(mockNamespacesRepository.delete).not.toHaveBeenCalled();
        });
    });

    describe('when the namespace still holds projects', () => {
        it('throws a NamespaceNotEmptyError', async () => {
            mockNamespacesRepository.countProjects.mockResolvedValue(2);

            await expect(
                deleteNamespaceUseCase(mockNamespacesRepository as unknown as NamespacesRepository, id),
            ).rejects.toBeInstanceOf(NamespaceNotEmptyError);
        });

        it('names the namespace and the blocking projects count in the message', async () => {
            mockNamespacesRepository.countProjects.mockResolvedValue(2);

            await expect(
                deleteNamespaceUseCase(mockNamespacesRepository as unknown as NamespacesRepository, id),
            ).rejects.toThrow(`Namespace ${id} still has 2 project(s) attached`);
        });

        it('never deletes the namespace', async () => {
            mockNamespacesRepository.countProjects.mockResolvedValue(1);

            await expect(
                deleteNamespaceUseCase(mockNamespacesRepository as unknown as NamespacesRepository, id),
            ).rejects.toBeInstanceOf(NamespaceNotEmptyError);
            expect(mockNamespacesRepository.delete).not.toHaveBeenCalled();
        });
    });
});
