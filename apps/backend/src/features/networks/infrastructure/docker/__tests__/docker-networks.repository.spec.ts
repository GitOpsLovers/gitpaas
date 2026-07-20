import type Docker from 'dockerode';

import { Network } from '../../../domain/models/network.model';
import { DockerNetworksRepository } from '../docker-networks.repository';

import { DockerClient } from '@core/infrastructure/docker/docker.client';
import { Service } from '@features/services/domain/models/service.model';

/**
 * Builds a Dockerode network summary, overriding only the fields under test.
 */
const networkInfo = (overrides: Partial<Docker.NetworkInspectInfo> = {}): Docker.NetworkInspectInfo => ({
    Id: 'a1b2c3d4e5f6a1b2c3d4e5f6',
    Name: 'my-service_default',
    Driver: 'bridge',
    Scope: 'local',
    Internal: false,
    Attachable: true,
    Created: '2025-07-11T00:00:00.000Z',
    EnableIPv6: false,
    IPAM: { Driver: 'default', Config: [] },
    Ingress: false,
    ConfigOnly: false,
    Containers: {},
    Options: {},
    Labels: {},
    ...overrides,
});

describe('DockerNetworksRepository', () => {
    const service: Service = {
        id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
        name: 'My Service!',
        projectId: 'b2a2132b-d6b7-464a-8aaf-c659a3ca0d60',
        repositoryId: '42',
        deploymentBranch: 'main',
        composerPath: 'docker-compose.yml',
    };

    let mockListNetworks: jest.Mock;
    let mockDockerClient: jest.Mocked<Pick<DockerClient, 'getClient'>>;
    let sut: DockerNetworksRepository;

    beforeEach(() => {
        jest.clearAllMocks();

        mockListNetworks = jest.fn().mockResolvedValue([]);
        const handle = {
            listNetworks: mockListNetworks,
        } as unknown as jest.Mocked<Pick<Docker, 'listNetworks'>>;
        mockDockerClient = { getClient: jest.fn().mockReturnValue(handle) };
        sut = new DockerNetworksRepository(mockDockerClient as unknown as DockerClient);
    });

    it('lists networks filtered by the compose project label derived from the service name', async () => {
        await sut.listByService(service);

        expect(mockListNetworks).toHaveBeenCalledTimes(1);
        expect(mockListNetworks).toHaveBeenCalledWith({
            filters: { label: ['com.docker.compose.project=my-service'] },
        });
    });

    it('falls back to a service-<id> label when the name slugifies to empty', async () => {
        const unnamed: Service = { ...service, name: '!!!' };

        await sut.listByService(unnamed);

        expect(mockListNetworks).toHaveBeenCalledWith({
            filters: { label: [`com.docker.compose.project=service-${unnamed.id}`] },
        });
    });

    it('maps a full network summary into the domain model', async () => {
        mockListNetworks.mockResolvedValue([networkInfo()]);

        const result = await sut.listByService(service);

        expect(result).toEqual<Network[]>([
            {
                id: 'a1b2c3d4e5f6a1b2c3d4e5f6',
                name: 'my-service_default',
                driver: 'bridge',
                scope: 'local',
                internal: false,
                attachable: true,
                createdAt: new Date('2025-07-11T00:00:00.000Z'),
            },
        ]);
    });

    it('returns an empty array when the daemon reports no networks', async () => {
        mockListNetworks.mockResolvedValue([]);

        const result = await sut.listByService(service);

        expect(result).toEqual([]);
    });
});
