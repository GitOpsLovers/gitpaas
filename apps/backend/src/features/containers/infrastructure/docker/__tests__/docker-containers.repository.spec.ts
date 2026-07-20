import type Docker from 'dockerode';

import { Container } from '../../../domain/models/container.model';
import { DockerContainersRepository } from '../docker-containers.repository';

import { DockerClient } from '@core/infrastructure/docker/docker.client';
import { Service } from '@features/services/domain/models/service.model';

/**
 * Builds a Dockerode container summary, overriding only the fields under test.
 */
const containerInfo = (overrides: Partial<Docker.ContainerInfo> = {}): Docker.ContainerInfo => ({
    Id: 'a1b2c3d4e5f6a1b2c3d4e5f6',
    Names: ['/web-frontend-app-1'],
    Image: 'web-frontend_app',
    ImageID: 'sha256:deadbeef',
    Command: 'node server.js',
    Created: 1_752_192_000,
    State: 'running',
    Status: 'Up 3 minutes',
    Ports: [{
        IP: '0.0.0.0', PrivatePort: 3000, PublicPort: 8080, Type: 'tcp',
    }],
    Labels: {},
    SizeRw: 0,
    SizeRootFs: 0,
    HostConfig: { NetworkMode: 'default' },
    NetworkSettings: { Networks: {} },
    Mounts: [],
    ...overrides,
} as Docker.ContainerInfo);

describe('DockerContainersRepository', () => {
    const service: Service = {
        id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
        name: 'My Service!',
        projectId: 'b2a2132b-d6b7-464a-8aaf-c659a3ca0d60',
        repositoryId: '42',
        deploymentBranch: 'main',
        composerPath: 'docker-compose.yml',
    };

    let mockListContainers: jest.Mock;
    let mockDockerClient: jest.Mocked<Pick<DockerClient, 'getClient'>>;
    let sut: DockerContainersRepository;

    beforeEach(() => {
        jest.clearAllMocks();

        mockListContainers = jest.fn().mockResolvedValue([]);
        const handle = {
            listContainers: mockListContainers,
        } as unknown as jest.Mocked<Pick<Docker, 'listContainers'>>;
        mockDockerClient = { getClient: jest.fn().mockReturnValue(handle) };
        sut = new DockerContainersRepository(mockDockerClient as unknown as DockerClient);
    });

    it('lists all containers filtered by the compose project label derived from the service name', async () => {
        await sut.listByService(service);

        expect(mockListContainers).toHaveBeenCalledTimes(1);
        expect(mockListContainers).toHaveBeenCalledWith({
            all: true,
            filters: { label: ['com.docker.compose.project=my-service'] },
        });
    });

    it('falls back to a service-<id> label when the name slugifies to empty', async () => {
        const unnamed: Service = { ...service, name: '!!!' };

        await sut.listByService(unnamed);

        expect(mockListContainers).toHaveBeenCalledWith({
            all: true,
            filters: { label: [`com.docker.compose.project=service-${unnamed.id}`] },
        });
    });

    it('maps a full container summary into the domain model', async () => {
        mockListContainers.mockResolvedValue([containerInfo()]);

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

    it('sets publicPort to null when the port is not published', async () => {
        mockListContainers.mockResolvedValue([
            containerInfo({ Ports: [{ PrivatePort: 5432, Type: 'tcp' } as Docker.Port] }),
        ]);

        const [container] = await sut.listByService(service);

        expect(container.ports).toEqual([{ privatePort: 5432, publicPort: null, type: 'tcp' }]);
    });

    it('falls back to the truncated id for the name when Names is missing or empty', async () => {
        mockListContainers.mockResolvedValue([
            containerInfo({ Names: undefined }),
            containerInfo({ Id: 'zzzzzzzzzzzzffffffffffff', Names: [] }),
        ]);

        const [fromMissing, fromEmpty] = await sut.listByService(service);

        expect(fromMissing.name).toBe('a1b2c3d4e5f6');
        expect(fromEmpty.name).toBe('zzzzzzzzzzzz');
    });

    it('returns an empty ports array when the summary has no ports', async () => {
        mockListContainers.mockResolvedValue([
            containerInfo({ Ports: undefined }),
            containerInfo({ Ports: [] }),
        ]);

        const [fromUndefined, fromEmpty] = await sut.listByService(service);

        expect(fromUndefined.ports).toEqual([]);
        expect(fromEmpty.ports).toEqual([]);
    });

    it('returns an empty array when the daemon reports no containers', async () => {
        mockListContainers.mockResolvedValue([]);

        const result = await sut.listByService(service);

        expect(result).toEqual([]);
    });
});
