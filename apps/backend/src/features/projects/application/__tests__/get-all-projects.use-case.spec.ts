import { Project } from '../../domain/models/project.models';
import { ProjectsRepository } from '../../domain/repositories/projects.repository';
import { getAllProjectsUseCase } from '../get-all-projects.use-case';

describe('getAllProjectsUseCase', () => {
    const namespaceId = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

    const projects: Project[] = [
        { id: '9c858901-8a57-4791-81fe-4c455b099bc9', name: 'GitPaaS', namespaceId },
    ];

    let mockProjectsRepository: jest.Mocked<Pick<ProjectsRepository, 'getAll'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockProjectsRepository = {
            getAll: jest.fn(),
        };
    });

    it('delegates the lookup to the repository with the provided namespace', async () => {
        mockProjectsRepository.getAll.mockResolvedValue(projects);

        await getAllProjectsUseCase(mockProjectsRepository as unknown as ProjectsRepository, namespaceId);

        expect(mockProjectsRepository.getAll).toHaveBeenCalledTimes(1);
        expect(mockProjectsRepository.getAll).toHaveBeenCalledWith(namespaceId);
    });

    it('returns the projects listed by the repository', async () => {
        mockProjectsRepository.getAll.mockResolvedValue(projects);

        const result = await getAllProjectsUseCase(
            mockProjectsRepository as unknown as ProjectsRepository,
            namespaceId,
        );

        expect(result).toBe(projects);
    });

    it('returns an empty list when the namespace holds no project', async () => {
        mockProjectsRepository.getAll.mockResolvedValue([]);

        const result = await getAllProjectsUseCase(
            mockProjectsRepository as unknown as ProjectsRepository,
            namespaceId,
        );

        expect(result).toEqual([]);
    });

    it('propagates errors thrown by the repository', async () => {
        const error = new Error('database unavailable');
        mockProjectsRepository.getAll.mockRejectedValue(error);

        await expect(
            getAllProjectsUseCase(mockProjectsRepository as unknown as ProjectsRepository, namespaceId),
        ).rejects.toThrow(error);
    });
});
