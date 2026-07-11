import { Project } from '../../domain/models/project.model';
import { ProjectsRepository } from '../../domain/repositories/projects.repository';
import { getAllProjectsUseCase } from '../get-all-projects.use-case';

describe('getAllProjectsUseCase', () => {
    const projects: Project[] = [
        { id: '9c858901-8a57-4791-81fe-4c455b099bc9', name: 'Artifactory' },
    ];

    let repository: jest.Mocked<ProjectsRepository>;

    beforeEach(() => {
        repository = {
            getAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        };
    });

    it('delegates the lookup to the repository', async () => {
        repository.getAll.mockResolvedValue(projects);

        await getAllProjectsUseCase(repository);

        expect(repository.getAll).toHaveBeenCalledTimes(1);
    });

    it('returns the projects listed by the repository', async () => {
        repository.getAll.mockResolvedValue(projects);

        const result = await getAllProjectsUseCase(repository);

        expect(result).toBe(projects);
    });

    it('propagates errors thrown by the repository', async () => {
        const error = new Error('database unavailable');
        repository.getAll.mockRejectedValue(error);

        await expect(getAllProjectsUseCase(repository)).rejects.toThrow(error);
    });
});
