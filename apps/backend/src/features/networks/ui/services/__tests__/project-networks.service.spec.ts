import type { CreateProjectNetworkDto, JoinProjectNetworkDto, UpdateProjectNetworkDto } from '@gitpaas/contracts';
import { Test } from '@nestjs/testing';

import { createProjectNetworkUseCase } from '../../../application/create-project-network.use-case';
import { deleteProjectNetworkUseCase } from '../../../application/delete-project-network.use-case';
import { getProjectNetworksUseCase } from '../../../application/get-project-networks.use-case';
import { joinServiceToNetworkUseCase } from '../../../application/join-service-to-network.use-case';
import { removeServiceFromNetworkUseCase } from '../../../application/remove-service-from-network.use-case';
import { renameProjectNetworkUseCase } from '../../../application/rename-project-network.use-case';
import { ProjectNetworkStatus } from '../../../domain/models/project-network.models';
import { DatabaseProjectNetworksRepository } from '../../../infrastructure/database/db-project-networks.repository';
import { DatabaseServiceNetworksRepository } from '../../../infrastructure/database/db-service-networks.repository';
import { ProjectNetworksService } from '../project-networks.service';

import { DockerContainerRuntimeAdapter } from '@core/infrastructure/docker/docker-container-runtime.adapter';
import { DatabaseProjectsRepository } from '@features/projects/infrastructure/database/db-projects.repository';
import { DatabaseServicesRepository } from '@features/services/infrastructure/database/db-services.repository';

jest.mock('../../../application/create-project-network.use-case');
jest.mock('../../../application/delete-project-network.use-case');
jest.mock('../../../application/get-project-networks.use-case');
jest.mock('../../../application/join-service-to-network.use-case');
jest.mock('../../../application/remove-service-from-network.use-case');
jest.mock('../../../application/rename-project-network.use-case');

const mockCreateProjectNetworkUseCase = createProjectNetworkUseCase as jest.MockedFunction<
    typeof createProjectNetworkUseCase
>;
const mockDeleteProjectNetworkUseCase = deleteProjectNetworkUseCase as jest.MockedFunction<
    typeof deleteProjectNetworkUseCase
>;
const mockGetProjectNetworksUseCase = getProjectNetworksUseCase as jest.MockedFunction<
    typeof getProjectNetworksUseCase
>;
const mockJoinServiceToNetworkUseCase = joinServiceToNetworkUseCase as jest.MockedFunction<
    typeof joinServiceToNetworkUseCase
>;
const mockRemoveServiceFromNetworkUseCase = removeServiceFromNetworkUseCase as jest.MockedFunction<
    typeof removeServiceFromNetworkUseCase
>;
const mockRenameProjectNetworkUseCase = renameProjectNetworkUseCase as jest.MockedFunction<
    typeof renameProjectNetworkUseCase
>;

const projectId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
const networkId = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';
const serviceId = 'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f';

const network: ProjectNetworkStatus = {
    id: networkId,
    projectId,
    name: 'private',
    daemonName: `gitpaas-${projectId}-${networkId}`,
    state: 'ready',
};

describe('ProjectNetworksService', () => {
    let mockProjectNetworksRepository: jest.Mocked<DatabaseProjectNetworksRepository>;
    let mockServiceNetworksRepository: jest.Mocked<DatabaseServiceNetworksRepository>;
    let mockProjectsRepository: jest.Mocked<DatabaseProjectsRepository>;
    let mockServicesRepository: jest.Mocked<DatabaseServicesRepository>;
    let mockContainerRuntime: jest.Mocked<DockerContainerRuntimeAdapter>;
    let sut: ProjectNetworksService;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockProjectNetworksRepository = {} as jest.Mocked<DatabaseProjectNetworksRepository>;
        mockServiceNetworksRepository = {} as jest.Mocked<DatabaseServiceNetworksRepository>;
        mockProjectsRepository = {} as jest.Mocked<DatabaseProjectsRepository>;
        mockServicesRepository = {} as jest.Mocked<DatabaseServicesRepository>;
        mockContainerRuntime = {} as jest.Mocked<DockerContainerRuntimeAdapter>;

        const moduleRef = await Test.createTestingModule({
            providers: [
                ProjectNetworksService,
                { provide: DatabaseProjectNetworksRepository, useValue: mockProjectNetworksRepository },
                { provide: DatabaseServiceNetworksRepository, useValue: mockServiceNetworksRepository },
                { provide: DatabaseProjectsRepository, useValue: mockProjectsRepository },
                { provide: DatabaseServicesRepository, useValue: mockServicesRepository },
                { provide: DockerContainerRuntimeAdapter, useValue: mockContainerRuntime },
            ],
        }).compile();

        sut = moduleRef.get(ProjectNetworksService);
    });

    describe('getByProject', () => {
        it('sends the repository, the runtime and the project to the use case', async () => {
            mockGetProjectNetworksUseCase.mockResolvedValue([network]);

            await sut.getByProject(projectId);

            expect(mockGetProjectNetworksUseCase).toHaveBeenCalledTimes(1);
            expect(mockGetProjectNetworksUseCase).toHaveBeenCalledWith(
                mockProjectNetworksRepository,
                mockContainerRuntime,
                projectId,
            );
        });

        it('returns the networks of the use case', async () => {
            mockGetProjectNetworksUseCase.mockResolvedValue([network]);

            expect(await sut.getByProject(projectId)).toEqual([network]);
        });

        it('returns an empty list when the project holds no network', async () => {
            mockGetProjectNetworksUseCase.mockResolvedValue([]);

            expect(await sut.getByProject(projectId)).toEqual([]);
        });

        it('propagates an error of the use case', async () => {
            const error = new Error('daemon unreachable');
            mockGetProjectNetworksUseCase.mockRejectedValue(error);

            await expect(sut.getByProject(projectId)).rejects.toThrow(error);
        });
    });

    describe('create', () => {
        const createDto: CreateProjectNetworkDto = { name: 'private' };

        it('sends every collaborator, the project and the body to the use case', async () => {
            mockCreateProjectNetworkUseCase.mockResolvedValue(network);

            await sut.create(projectId, createDto);

            expect(mockCreateProjectNetworkUseCase).toHaveBeenCalledWith(
                mockProjectsRepository,
                mockProjectNetworksRepository,
                mockContainerRuntime,
                projectId,
                createDto,
            );
        });

        it('returns the network of the use case', async () => {
            mockCreateProjectNetworkUseCase.mockResolvedValue(network);

            expect(await sut.create(projectId, createDto)).toBe(network);
        });
    });

    describe('rename', () => {
        const updateDto: UpdateProjectNetworkDto = { name: 'backend' };

        it('sends the repository, the runtime, the project, the network and the body to the use case', async () => {
            mockRenameProjectNetworkUseCase.mockResolvedValue(network);

            await sut.rename(projectId, networkId, updateDto);

            expect(mockRenameProjectNetworkUseCase).toHaveBeenCalledWith(
                mockProjectNetworksRepository,
                mockContainerRuntime,
                projectId,
                networkId,
                updateDto,
            );
        });

        it('returns the renamed network of the use case', async () => {
            mockRenameProjectNetworkUseCase.mockResolvedValue(network);

            expect(await sut.rename(projectId, networkId, updateDto)).toBe(network);
        });
    });

    describe('remove', () => {
        it('sends the repository, the runtime, the project and the network to the use case', async () => {
            mockDeleteProjectNetworkUseCase.mockResolvedValue();

            await sut.remove(projectId, networkId);

            expect(mockDeleteProjectNetworkUseCase).toHaveBeenCalledWith(
                mockProjectNetworksRepository,
                mockContainerRuntime,
                projectId,
                networkId,
            );
        });

        it('propagates an error of the use case', async () => {
            const error = new Error('network in use');
            mockDeleteProjectNetworkUseCase.mockRejectedValue(error);

            await expect(sut.remove(projectId, networkId)).rejects.toThrow(error);
        });
    });

    describe('join', () => {
        const joinDto: JoinProjectNetworkDto = { serviceId };

        it('sends the three repositories, the project, the network and the body to the use case', async () => {
            mockJoinServiceToNetworkUseCase.mockResolvedValue();

            await sut.join(projectId, networkId, joinDto);

            expect(mockJoinServiceToNetworkUseCase).toHaveBeenCalledWith(
                mockServicesRepository,
                mockProjectNetworksRepository,
                mockServiceNetworksRepository,
                projectId,
                networkId,
                joinDto,
            );
        });
    });

    describe('leave', () => {
        it('sends the two repositories, the project, the network and the service to the use case', async () => {
            mockRemoveServiceFromNetworkUseCase.mockResolvedValue();

            await sut.leave(projectId, networkId, serviceId);

            expect(mockRemoveServiceFromNetworkUseCase).toHaveBeenCalledWith(
                mockProjectNetworksRepository,
                mockServiceNetworksRepository,
                projectId,
                networkId,
                serviceId,
            );
        });
    });
});
