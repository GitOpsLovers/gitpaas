import { ProjectsRepository } from '../../domain/repositories/projects.repository';
import { deleteProjectUseCase } from '../delete-project.use-case';

describe('deleteProjectUseCase', () => {
    const id = '9c858901-8a57-4791-81fe-4c455b099bc9';

    let mockProjectsRepository: jest.Mocked<Pick<ProjectsRepository, 'delete'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockProjectsRepository = {
            delete: jest.fn(),
        };
    });

    it('delegates deletion to the repository with the provided id', async () => {
        mockProjectsRepository.delete.mockResolvedValue(true);

        await deleteProjectUseCase(mockProjectsRepository as unknown as ProjectsRepository, id);

        expect(mockProjectsRepository.delete).toHaveBeenCalledTimes(1);
        expect(mockProjectsRepository.delete).toHaveBeenCalledWith(id);
    });

    it('returns true when the repository deletes a row', async () => {
        mockProjectsRepository.delete.mockResolvedValue(true);

        const result = await deleteProjectUseCase(mockProjectsRepository as unknown as ProjectsRepository, id);

        expect(result).toBe(true);
    });

    it('returns false when the repository deletes nothing', async () => {
        mockProjectsRepository.delete.mockResolvedValue(false);

        const result = await deleteProjectUseCase(mockProjectsRepository as unknown as ProjectsRepository, id);

        expect(result).toBe(false);
    });

    it('propagates errors thrown by the repository', async () => {
        const error = new Error('database unavailable');
        mockProjectsRepository.delete.mockRejectedValue(error);

        await expect(
            deleteProjectUseCase(mockProjectsRepository as unknown as ProjectsRepository, id),
        ).rejects.toThrow(error);
    });
});
