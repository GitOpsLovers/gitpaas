import type { JoinProjectNetworkDto } from '@gitpaas/contracts';

import { ProjectNetworkNotFoundError } from '../../domain/errors/project-network.errors';
import { ProjectNetwork } from '../../domain/models/project-network.models';
import { ProjectNetworksRepository } from '../../domain/repositories/project-networks.repository';
import { ServiceNetworksRepository } from '../../domain/repositories/service-networks.repository';
import { joinServiceToNetworkUseCase } from '../join-service-to-network.use-case';

import { ServiceNotFoundError } from '@features/services/domain/errors/service.errors';
import { Service } from '@features/services/domain/models/service.models';
import { ServicesRepository } from '@features/services/domain/repositories/services.repository';

const projectId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
const networkId = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';
const serviceId = 'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f';

/** Builds a network of a project fixture, overriding only the fields under test. */
const network = (overrides: Partial<ProjectNetwork> = {}): ProjectNetwork => ({
    id: networkId,
    projectId,
    name: 'private',
    daemonName: `gitpaas-${projectId}-${networkId}`,
    ...overrides,
});

/** Builds a service fixture, overriding only the fields under test. */
const service = (overrides: Partial<Service> = {}): Service => ({
    id: serviceId,
    name: 'web',
    projectId,
    providerId: null,
    repositoryId: '42',
    deploymentBranch: 'main',
    composerPath: 'docker-compose.yml',
    ...overrides,
});

const joinDto: JoinProjectNetworkDto = { serviceId };

describe('joinServiceToNetworkUseCase', () => {
    let mockServicesRepository: jest.Mocked<Pick<ServicesRepository, 'findById'>>;
    let mockNetworksRepository: jest.Mocked<Pick<ProjectNetworksRepository, 'findById'>>;
    let mockServiceNetworksRepository: jest.Mocked<Pick<ServiceNetworksRepository, 'join'>>;

    beforeEach(() => {
        jest.clearAllMocks();

        mockServicesRepository = { findById: jest.fn() };
        mockNetworksRepository = { findById: jest.fn() };
        mockServiceNetworksRepository = { join: jest.fn() };
    });

    /** Runs the use case with the mocked ports. */
    const run = (dto: JoinProjectNetworkDto = joinDto) =>
        joinServiceToNetworkUseCase(
            mockServicesRepository as unknown as ServicesRepository,
            mockNetworksRepository as unknown as ProjectNetworksRepository,
            mockServiceNetworksRepository as unknown as ServiceNetworksRepository,
            projectId,
            networkId,
            dto,
        );

    it('joins the service to the network of its project', async () => {
        mockNetworksRepository.findById.mockResolvedValue(network());
        mockServicesRepository.findById.mockResolvedValue(service());

        await expect(run()).resolves.toBeUndefined();

        expect(mockServiceNetworksRepository.join).toHaveBeenCalledTimes(1);
        expect(mockServiceNetworksRepository.join).toHaveBeenCalledWith(serviceId, networkId);
    });

    it('throws when the project holds no network of that id', async () => {
        mockNetworksRepository.findById.mockResolvedValue(null);

        await expect(run()).rejects.toBeInstanceOf(ProjectNetworkNotFoundError);

        expect(mockServiceNetworksRepository.join).not.toHaveBeenCalled();
    });

    it('throws when the network belongs to a different project', async () => {
        mockNetworksRepository.findById.mockResolvedValue(
            network({ projectId: 'd4e5f6a7-b8c9-4d0e-9f1a-2b3c4d5e6f70' }),
        );

        await expect(run()).rejects.toBeInstanceOf(ProjectNetworkNotFoundError);

        expect(mockServicesRepository.findById).not.toHaveBeenCalled();
    });

    it('throws when no service carries that id', async () => {
        mockNetworksRepository.findById.mockResolvedValue(network());
        mockServicesRepository.findById.mockResolvedValue(null);

        await expect(run()).rejects.toBeInstanceOf(ServiceNotFoundError);

        expect(mockServiceNetworksRepository.join).not.toHaveBeenCalled();
    });

    it('throws when the service belongs to a different project', async () => {
        mockNetworksRepository.findById.mockResolvedValue(network());
        mockServicesRepository.findById.mockResolvedValue(
            service({ projectId: 'd4e5f6a7-b8c9-4d0e-9f1a-2b3c4d5e6f70' }),
        );

        await expect(run()).rejects.toBeInstanceOf(ServiceNotFoundError);

        expect(mockServiceNetworksRepository.join).not.toHaveBeenCalled();
    });

    it('propagates an error of the repository of the join', async () => {
        const error = new Error('db unreachable');
        mockNetworksRepository.findById.mockResolvedValue(network());
        mockServicesRepository.findById.mockResolvedValue(service());
        mockServiceNetworksRepository.join.mockRejectedValue(error);

        await expect(run()).rejects.toThrow(error);
    });
});
