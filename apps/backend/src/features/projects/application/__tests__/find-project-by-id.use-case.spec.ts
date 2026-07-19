/* eslint-disable no-secrets/no-secrets */
import { Project } from '../../domain/models/project.model';
import { ProjectsRepository } from '../../domain/repositories/projects.repository';
import { findProjectByIdUseCase } from '../find-project-by-id.use-case';

describe('findProjectByIdUseCase', () => {
    const id = '9c858901-8a57-4791-81fe-4c455b099bc9';

    const project: Project = { id, name: 'GitPaaS' };

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

    it('delegates the lookup to the repository with the provided id', async () => {
        repository.findById.mockResolvedValue(project);

        await findProjectByIdUseCase(repository, id);

        expect(repository.findById).toHaveBeenCalledTimes(1);
        expect(repository.findById).toHaveBeenCalledWith(id);
    });

    it('returns the project found by the repository', async () => {
        repository.findById.mockResolvedValue(project);

        const result = await findProjectByIdUseCase(repository, id);

        expect(result).toBe(project);
    });

    it('returns null when the project does not exist', async () => {
        repository.findById.mockResolvedValue(null);

        const result = await findProjectByIdUseCase(repository, id);

        expect(result).toBeNull();
    });

    it('propagates errors thrown by the repository', async () => {
        const error = new Error('database unavailable');
        repository.findById.mockRejectedValue(error);

        await expect(findProjectByIdUseCase(repository, id)).rejects.toThrow(error);
    });
});
