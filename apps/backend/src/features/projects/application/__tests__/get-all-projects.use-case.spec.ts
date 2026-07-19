import { Project } from '../../domain/models/project.model';
import { ProjectsRepository } from '../../domain/repositories/projects.repository';
import { getAllProjectsUseCase } from '../get-all-projects.use-case';

describe('getAllProjectsUseCase', () => {
    const projects: Project[] = [
        { id: '9c858901-8a57-4791-81fe-4c455b099bc9', name: 'GitPaaS' },
    ];

    let mockProjectsRepository: jest.Mocked<Pick<ProjectsRepository, 'getAll'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockProjectsRepository = {
            getAll: jest.fn(),
        };
    });

    it('delegates the lookup to the repository', async () => {
        mockProjectsRepository.getAll.mockResolvedValue(projects);

        await getAllProjectsUseCase(mockProjectsRepository as unknown as ProjectsRepository);

        expect(mockProjectsRepository.getAll).toHaveBeenCalledTimes(1);
    });

    it('returns the projects listed by the repository', async () => {
        mockProjectsRepository.getAll.mockResolvedValue(projects);

        const result = await getAllProjectsUseCase(mockProjectsRepository as unknown as ProjectsRepository);

        expect(result).toBe(projects);
    });

    it('propagates errors thrown by the repository', async () => {
        const error = new Error('database unavailable');
        mockProjectsRepository.getAll.mockRejectedValue(error);

        await expect(
            getAllProjectsUseCase(mockProjectsRepository as unknown as ProjectsRepository),
        ).rejects.toThrow(error);
    });
});
