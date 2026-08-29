import { ProjectNetworkNotFoundError } from '../../domain/errors/project-network.errors';
import { ProjectNetwork } from '../../domain/models/project-network.models';
import { ProjectNetworksRepository } from '../../domain/repositories/project-networks.repository';
import { ServiceNetworksRepository } from '../../domain/repositories/service-networks.repository';
import { removeServiceFromNetworkUseCase } from '../remove-service-from-network.use-case';

import { ServiceNotFoundError } from '@features/services/domain/errors/service.errors';

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

describe('removeServiceFromNetworkUseCase', () => {
    let mockNetworksRepository: jest.Mocked<Pick<ProjectNetworksRepository, 'findById'>>;
    let mockServiceNetworksRepository: jest.Mocked<Pick<ServiceNetworksRepository, 'leave'>>;

    beforeEach(() => {
        jest.clearAllMocks();

        mockNetworksRepository = { findById: jest.fn() };
        mockServiceNetworksRepository = { leave: jest.fn() };
    });

    /** Runs the use case with the mocked ports. */
    const run = () =>
        removeServiceFromNetworkUseCase(
            mockNetworksRepository as unknown as ProjectNetworksRepository,
            mockServiceNetworksRepository as unknown as ServiceNetworksRepository,
            projectId,
            networkId,
            serviceId,
        );

    it('removes the service from the network of its project', async () => {
        mockNetworksRepository.findById.mockResolvedValue(network());
        mockServiceNetworksRepository.leave.mockResolvedValue(true);

        await expect(run()).resolves.toBeUndefined();

        expect(mockServiceNetworksRepository.leave).toHaveBeenCalledTimes(1);
        expect(mockServiceNetworksRepository.leave).toHaveBeenCalledWith(serviceId, networkId);
    });

    it('throws when the project holds no network of that id', async () => {
        mockNetworksRepository.findById.mockResolvedValue(null);

        await expect(run()).rejects.toBeInstanceOf(ProjectNetworkNotFoundError);

        expect(mockServiceNetworksRepository.leave).not.toHaveBeenCalled();
    });

    it('throws when the network belongs to a different project', async () => {
        mockNetworksRepository.findById.mockResolvedValue(
            network({ projectId: 'd4e5f6a7-b8c9-4d0e-9f1a-2b3c4d5e6f70' }),
        );

        await expect(run()).rejects.toBeInstanceOf(ProjectNetworkNotFoundError);

        expect(mockServiceNetworksRepository.leave).not.toHaveBeenCalled();
    });

    it('throws when that service never joined the network', async () => {
        mockNetworksRepository.findById.mockResolvedValue(network());
        mockServiceNetworksRepository.leave.mockResolvedValue(false);

        await expect(run()).rejects.toBeInstanceOf(ServiceNotFoundError);
    });

    it('propagates an error of the repository of the join', async () => {
        const error = new Error('db unreachable');
        mockNetworksRepository.findById.mockResolvedValue(network());
        mockServiceNetworksRepository.leave.mockRejectedValue(error);

        await expect(run()).rejects.toThrow(error);
    });
});
