/* eslint-disable no-secrets/no-secrets */
import { Project } from '../../domain/models/project.model';
import { ProjectsRepository } from '../../domain/repositories/projects.repository';
import { findProjectByIdUseCase } from '../find-project-by-id.use-case';

describe('findProjectByIdUseCase', () => {
    const id = '9c858901-8a57-4791-81fe-4c455b099bc9';

    const project: Project = { id, name: 'GitPaaS' };

    let mockProjectsRepository: jest.Mocked<Pick<ProjectsRepository, 'findById'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockProjectsRepository = {
            findById: jest.fn(),
        };
    });

    it('delegates the lookup to the repository with the provided id', async () => {
        mockProjectsRepository.findById.mockResolvedValue(project);

        await findProjectByIdUseCase(mockProjectsRepository as unknown as ProjectsRepository, id);

        expect(mockProjectsRepository.findById).toHaveBeenCalledTimes(1);
        expect(mockProjectsRepository.findById).toHaveBeenCalledWith(id);
    });

    it('returns the project found by the repository', async () => {
        mockProjectsRepository.findById.mockResolvedValue(project);

        const result = await findProjectByIdUseCase(mockProjectsRepository as unknown as ProjectsRepository, id);

        expect(result).toBe(project);
    });

    it('returns null when the project does not exist', async () => {
        mockProjectsRepository.findById.mockResolvedValue(null);

        const result = await findProjectByIdUseCase(mockProjectsRepository as unknown as ProjectsRepository, id);

        expect(result).toBeNull();
    });

    it('propagates errors thrown by the repository', async () => {
        const error = new Error('database unavailable');
        mockProjectsRepository.findById.mockRejectedValue(error);

        await expect(
            findProjectByIdUseCase(mockProjectsRepository as unknown as ProjectsRepository, id),
        ).rejects.toThrow(error);
    });
});
