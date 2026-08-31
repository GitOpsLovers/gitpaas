import { Container } from '../../../domain/models/container.models';
import { DockerContainersRepository } from '../docker-containers.repository';

import { GITPAAS_MANAGED_LABEL, GITPAAS_MANAGED_VALUE } from '@core/domain/constants/gitpaas-labels.constants';
import type { RuntimeContainerSummary, RuntimeSelector } from '@core/domain/models/container-runtime.models';
import { DockerContainerRuntimeAdapter } from '@core/infrastructure/docker/docker-container-runtime.adapter';
import { Service } from '@features/services/domain/models/service.models';

/** GitPaaS ownership marker every listing is scoped to. */
const managedLabels = { [GITPAAS_MANAGED_LABEL]: GITPAAS_MANAGED_VALUE };

/**
 * Builds a runtime container summary, overriding only the fields under test.
 */
const containerSummary = (overrides: Partial<RuntimeContainerSummary> = {}): RuntimeContainerSummary => ({
    id: 'a1b2c3d4e5f6a1b2c3d4e5f6',
    names: ['/web-frontend-app-1'],
    image: 'web-frontend_app',
    state: 'running',
    status: 'Up 3 minutes',
    createdAt: new Date(1_752_192_000 * 1000),
    projects: ['my-service', 'my-service'],
    ports: [{ privatePort: 3000, publicPort: 8080, type: 'tcp' }],
    networks: [],
    ...overrides,
});

describe('DockerContainersRepository', () => {
    const service: Service = {
        id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
        name: 'My Service!',
        description: '',
        projectId: 'b2a2132b-d6b7-464a-8aaf-c659a3ca0d60',
        providerId: 'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f',
        repositoryId: '42',
        deploymentBranch: 'main',
        composerPath: 'docker-compose.yml',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    let mockListContainers: jest.Mock;
    let mockContainerRuntime: jest.Mocked<Pick<DockerContainerRuntimeAdapter, 'listContainers'>>;
    let sut: DockerContainersRepository;

    beforeEach(() => {
        jest.clearAllMocks();

        mockListContainers = jest.fn().mockResolvedValue([]);
        mockContainerRuntime = { listContainers: mockListContainers };
        sut = new DockerContainersRepository(mockContainerRuntime as unknown as DockerContainerRuntimeAdapter);
    });

    it('lists all containers scoped to the GitPaaS marker and the service project', async () => {
        await sut.listByService(service);

        expect(mockListContainers).toHaveBeenCalledTimes(1);
        expect(mockListContainers).toHaveBeenCalledWith({ labels: managedLabels, project: 'my-service' }, true);
    });

    it('falls back to a service-<id> project when the name slugifies to empty', async () => {
        const unnamed: Service = { ...service, name: '!!!' };

        await sut.listByService(unnamed);

        expect(mockListContainers).toHaveBeenCalledWith(
            { labels: managedLabels, project: `service-${unnamed.id}` },
            true,
        );
    });

    it('maps a full container summary into the domain model', async () => {
        mockListContainers.mockResolvedValue([containerSummary()]);

        const result = await sut.listByService(service);

        expect(result).toEqual<Container[]>([
            {
                id: 'a1b2c3d4e5f6a1b2c3d4e5f6',
                name: 'web-frontend-app-1',
                image: 'web-frontend_app',
                state: 'running',
                status: 'Up 3 minutes',
                createdAt: new Date(1_752_192_000 * 1000),
                ports: [{ privatePort: 3000, publicPort: 8080, type: 'tcp' }],
            },
        ]);
    });

    it('keeps an unpublished port as a null public port', async () => {
        mockListContainers.mockResolvedValue([
            containerSummary({ ports: [{ privatePort: 5432, publicPort: null, type: 'tcp' }] }),
        ]);

        const [container] = await sut.listByService(service);

        expect(container.ports).toEqual([{ privatePort: 5432, publicPort: null, type: 'tcp' }]);
    });

    it('falls back to the truncated id for the name when the container has no names', async () => {
        mockListContainers.mockResolvedValue([
            containerSummary({ id: 'zzzzzzzzzzzzffffffffffff', names: [] }),
        ]);

        const [container] = await sut.listByService(service);

        expect(container.name).toBe('zzzzzzzzzzzz');
    });

    it('returns an empty ports array when the summary has no ports', async () => {
        mockListContainers.mockResolvedValue([containerSummary({ ports: [] })]);

        const [container] = await sut.listByService(service);

        expect(container.ports).toEqual([]);
    });

    it('never surfaces a container the runtime did not select for the service', async () => {
        const owned = containerSummary({ id: 'aaaaaaaaaaaaaaaaaaaaaaaa' });
        const foreign = containerSummary({ id: 'bbbbbbbbbbbbbbbbbbbbbbbb', projects: [] });
        // Honours the requested selector the way the runtime does, so the SUT is
        // driven against an unfiltered host set rather than a pre-filtered one.
        mockListContainers.mockImplementation((selector: RuntimeSelector) => Promise.resolve(
            [owned, foreign].filter((container) => container.projects.includes(String(selector.project))),
        ));

        const result = await sut.listByService(service);

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('aaaaaaaaaaaaaaaaaaaaaaaa');
    });

    it('returns an empty array when the runtime reports no containers', async () => {
        mockListContainers.mockResolvedValue([]);

        const result = await sut.listByService(service);

        expect(result).toEqual([]);
    });
});
