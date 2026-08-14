import { CreateProjectDto } from '../../domain/dtos/create-project.dto';
import { Project } from '../../domain/models/project.models';
import { ProjectsRepository } from '../../domain/repositories/projects.repository';
import { createProjectUseCase } from '../create-project.use-case';

describe('createProjectUseCase', () => {
    const namespaceId = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
    const createDto: CreateProjectDto = { name: 'GitPaaS' };

    const createdProject: Project = {
        id: '9c858901-8a57-4791-81fe-4c455b099bc9',
        name: createDto.name,
        namespaceId,
    };

    let mockProjectsRepository: jest.Mocked<Pick<ProjectsRepository, 'create'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockProjectsRepository = {
            create: jest.fn(),
        };
    });

    it('delegates creation to the repository with the DTO merged with the namespace', async () => {
        mockProjectsRepository.create.mockResolvedValue(createdProject);

        await createProjectUseCase(mockProjectsRepository as unknown as ProjectsRepository, namespaceId, createDto);

        expect(mockProjectsRepository.create).toHaveBeenCalledTimes(1);
        expect(mockProjectsRepository.create).toHaveBeenCalledWith({ name: createDto.name, namespaceId });
    });

    it('never mutates the DTO it received while merging the namespace into it', async () => {
        const dto: CreateProjectDto = { name: 'GitPaaS' };
        mockProjectsRepository.create.mockResolvedValue(createdProject);

        await createProjectUseCase(mockProjectsRepository as unknown as ProjectsRepository, namespaceId, dto);

        expect(dto).toEqual({ name: 'GitPaaS' });
    });

    it('writes the namespace it received, and not one carried by the created project', async () => {
        const otherNamespaceId = '0a9d7ef7-8b6c-4f42-a1c2-9de3e33a95a1';
        mockProjectsRepository.create.mockResolvedValue(createdProject);

        await createProjectUseCase(
            mockProjectsRepository as unknown as ProjectsRepository,
            otherNamespaceId,
            createDto,
        );

        expect(mockProjectsRepository.create).toHaveBeenCalledWith({
            name: createDto.name,
            namespaceId: otherNamespaceId,
        });
    });

    it('returns the project created by the repository', async () => {
        mockProjectsRepository.create.mockResolvedValue(createdProject);

        const result = await createProjectUseCase(
            mockProjectsRepository as unknown as ProjectsRepository,
            namespaceId,
            createDto,
        );

        expect(result).toBe(createdProject);
    });

    it('propagates errors thrown by the repository', async () => {
        const error = new Error('database unavailable');
        mockProjectsRepository.create.mockRejectedValue(error);

        await expect(
            createProjectUseCase(mockProjectsRepository as unknown as ProjectsRepository, namespaceId, createDto),
        ).rejects.toThrow(error);
    });
});
