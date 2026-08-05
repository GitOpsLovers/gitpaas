import { Network } from '../../../domain/models/network.models';
import { DockerNetworksRepository } from '../docker-networks.repository';

import { GITPAAS_MANAGED_LABEL, GITPAAS_MANAGED_VALUE } from '@core/domain/constants/gitpaas-labels.constants';
import type { RuntimeNetworkSummary } from '@core/domain/models/container-runtime.models';
import { DockerContainerRuntimeAdapter } from '@core/infrastructure/docker/docker-container-runtime.adapter';
import { Service } from '@features/services/domain/models/service.models';

/** GitPaaS ownership marker every listing is scoped to. */
const managedLabels = { [GITPAAS_MANAGED_LABEL]: GITPAAS_MANAGED_VALUE };

/**
 * Builds a runtime network summary, overriding only the fields under test.
 */
const networkSummary = (overrides: Partial<RuntimeNetworkSummary> = {}): RuntimeNetworkSummary => ({
    id: 'a1b2c3d4e5f6a1b2c3d4e5f6',
    name: 'my-service_default',
    driver: 'bridge',
    scope: 'local',
    internal: false,
    attachable: true,
    createdAt: new Date('2025-07-11T00:00:00.000Z'),
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
    let mockContainerRuntime: jest.Mocked<Pick<DockerContainerRuntimeAdapter, 'listNetworks'>>;
    let sut: DockerNetworksRepository;

    beforeEach(() => {
        jest.clearAllMocks();

        mockListNetworks = jest.fn().mockResolvedValue([]);
        mockContainerRuntime = { listNetworks: mockListNetworks };
        sut = new DockerNetworksRepository(mockContainerRuntime as unknown as DockerContainerRuntimeAdapter);
    });

    it('lists networks scoped to the GitPaaS marker and the service project', async () => {
        await sut.listByService(service);

        expect(mockListNetworks).toHaveBeenCalledTimes(1);
        expect(mockListNetworks).toHaveBeenCalledWith({ labels: managedLabels, project: 'my-service' });
    });

    it('falls back to a service-<id> project when the name slugifies to empty', async () => {
        const unnamed: Service = { ...service, name: '!!!' };

        await sut.listByService(unnamed);

        expect(mockListNetworks).toHaveBeenCalledWith({ labels: managedLabels, project: `service-${unnamed.id}` });
    });

    it('maps a full network summary into the domain model', async () => {
        mockListNetworks.mockResolvedValue([networkSummary()]);

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

    it('returns an empty array when the runtime reports no networks', async () => {
        mockListNetworks.mockResolvedValue([]);

        const result = await sut.listByService(service);

        expect(result).toEqual([]);
    });
});
