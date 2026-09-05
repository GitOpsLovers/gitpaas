import type { CreateServiceDto } from '@gitpaas/contracts';

import { Service } from '../../domain/models/service.models';
import { ServicesRepository } from '../../domain/repositories/services.repository';
import { createServiceUseCase } from '../create-service.use-case';

import { NamespaceNotFoundError } from '@features/namespaces/domain/errors/namespace.errors';
import { Namespace } from '@features/namespaces/domain/models/namespace.models';
import { NamespacesRepository } from '@features/namespaces/domain/repositories/namespaces.repository';
import { ProjectNotFoundError } from '@features/projects/domain/errors/project.errors';
import { Project } from '@features/projects/domain/models/project.models';
import { ProjectsRepository } from '@features/projects/domain/repositories/projects.repository';

describe('createServiceUseCase', () => {
    const providerId = 'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f';
    const projectId = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
    const namespaceId = '5b1f6f2c-9c4b-4b1e-8a5f-0a1b2c3d4e5f';

    const createDto: CreateServiceDto = {
        name: 'api',
        description: 'The gateway of the API',
        projectId,
        providerId,
    };

    /** Builds the namespace that owns the project of the service. */
    const namespace = (overrides: Partial<Namespace> = {}): Namespace => ({
        id: namespaceId,
        name: 'gitpaas',
        description: '',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        ...overrides,
    });

    /** Builds the project the service is created in. */
    const project = (overrides: Partial<Project> = {}): Project => ({
        id: projectId,
        name: 'web',
        description: '',
        namespaceId,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        ...overrides,
    });

    const createdService: Service = {
        id: '9c858901-8a57-4791-81fe-4c455b099bc9',
        name: createDto.name,
        description: 'The gateway of the API',
        projectId,
        composeProject: 'gitpaas_web_api',
        providerId,
        repositoryId: '42',
        deploymentBranch: 'main',
        composerPath: 'docker-compose.yml',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    let mockServicesRepository: jest.Mocked<Pick<ServicesRepository, 'create'>>;
    let mockProjectsRepository: jest.Mocked<Pick<ProjectsRepository, 'findById'>>;
    let mockNamespacesRepository: jest.Mocked<Pick<NamespacesRepository, 'findById'>>;

    /** Runs the use case with the mocked repositories, applying the casts one time. */
    const run = (dto: CreateServiceDto = createDto): Promise<Service> =>
        createServiceUseCase(
            mockServicesRepository as unknown as ServicesRepository,
            mockProjectsRepository as unknown as ProjectsRepository,
            mockNamespacesRepository as unknown as NamespacesRepository,
            dto,
        );

    beforeEach(() => {
        jest.clearAllMocks();
        mockServicesRepository = { create: jest.fn() };
        mockProjectsRepository = { findById: jest.fn() };
        mockNamespacesRepository = { findById: jest.fn() };

        mockProjectsRepository.findById.mockResolvedValue(project());
        mockNamespacesRepository.findById.mockResolvedValue(namespace());
        mockServicesRepository.create.mockResolvedValue(createdService);
    });

    it('delegates creation to the repository with the DTO and the name of the compose project', async () => {
        await run();

        expect(mockServicesRepository.create).toHaveBeenCalledTimes(1);
        expect(mockServicesRepository.create).toHaveBeenCalledWith({
            ...createDto,
            composeProject: 'gitpaas_web_api',
        });
    });

    it('reads the namespace of the project of the service', async () => {
        await run();

        expect(mockProjectsRepository.findById).toHaveBeenCalledWith(projectId);
        expect(mockNamespacesRepository.findById).toHaveBeenCalledWith(namespaceId);
    });

    it('converts each segment of the name of the compose project into [a-z0-9_]', async () => {
        mockNamespacesRepository.findById.mockResolvedValue(namespace({ name: 'git paas.io' }));
        mockProjectsRepository.findById.mockResolvedValue(project({ name: 'my--web!' }));

        await run();

        expect(mockServicesRepository.create).toHaveBeenCalledWith(
            expect.objectContaining({ composeProject: 'git_paas_io_my_web_api' }),
        );
    });

    it('normalizes an uppercase letter and a space of the names, and raises no error', async () => {
        mockNamespacesRepository.findById.mockResolvedValue(namespace({ name: 'Personal' }));
        mockProjectsRepository.findById.mockResolvedValue(project({ name: 'Common Databases' }));

        await run();

        expect(mockServicesRepository.create).toHaveBeenCalledWith(
            expect.objectContaining({ composeProject: 'personal_common_databases_api' }),
        );
    });

    it('falls back to the segment service when the name of the service holds no usable character', async () => {
        await run({ ...createDto, name: '###' });

        expect(mockServicesRepository.create).toHaveBeenCalledWith(
            expect.objectContaining({ composeProject: 'gitpaas_web_service' }),
        );
    });

    it('returns the service created by the repository', async () => {
        const result = await run();

        expect(result).toBe(createdService);
    });

    it('delegates a DTO that names no provider, and returns the service with a null provider', async () => {
        const dtoWithoutProvider: CreateServiceDto = { name: createDto.name, projectId };
        mockServicesRepository.create.mockResolvedValue({ ...createdService, providerId: null });

        const result = await run(dtoWithoutProvider);

        expect(mockServicesRepository.create).toHaveBeenCalledWith({
            ...dtoWithoutProvider,
            composeProject: 'gitpaas_web_api',
        });
        expect(result.providerId).toBeNull();
    });

    it('delegates a name that holds an uppercase letter and a space, because the daemon receives a normalized name', async () => {
        await run({ ...createDto, name: 'The API' });

        expect(mockServicesRepository.create).toHaveBeenCalledWith({
            ...createDto,
            name: 'The API',
            composeProject: 'gitpaas_web_the_api',
        });
    });

    it('throws ProjectNotFoundError when the project does not exist', async () => {
        mockProjectsRepository.findById.mockResolvedValue(null);

        await expect(run()).rejects.toBeInstanceOf(ProjectNotFoundError);
        expect(mockServicesRepository.create).not.toHaveBeenCalled();
    });

    it('throws NamespaceNotFoundError when the namespace of the project does not exist', async () => {
        mockNamespacesRepository.findById.mockResolvedValue(null);

        await expect(run()).rejects.toBeInstanceOf(NamespaceNotFoundError);
        expect(mockServicesRepository.create).not.toHaveBeenCalled();
    });

    it('propagates errors thrown by the repository', async () => {
        const error = new Error('database unavailable');
        mockServicesRepository.create.mockRejectedValue(error);

        await expect(run()).rejects.toThrow(error);
    });
});
