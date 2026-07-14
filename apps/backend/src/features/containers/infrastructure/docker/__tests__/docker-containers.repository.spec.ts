import Docker from 'dockerode';

import { Container } from '../../../domain/models/container.model';
import { DockerContainersRepository } from '../docker-containers.repository';

import { DockerClient } from '@core/infrastructure/docker/docker.client';
import { Service } from '@features/services/domain/models/service.model';

/**
 * Builds a Dockerode container summary, overriding only the fields under test.
 */
function containerInfo(overrides: Partial<Docker.ContainerInfo> = {}): Docker.ContainerInfo {
    return {
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
    } as Docker.ContainerInfo;
}

describe('DockerContainersRepository', () => {
    const service: Service = {
        id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
        name: 'My Service!',
        projectId: 'b2a2132b-d6b7-464a-8aaf-c659a3ca0d60',
        repositoryId: '42',
        deploymentBranch: 'main',
        composerPath: 'docker-compose.yml',
    };

    let listContainers: jest.Mock;
    let client: jest.Mocked<DockerClient>;
    let repository: DockerContainersRepository;

    beforeEach(() => {
        listContainers = jest.fn().mockResolvedValue([]);
        client = {
            getClient: jest.fn().mockReturnValue({ listContainers }),
        } as unknown as jest.Mocked<DockerClient>;
        repository = new DockerContainersRepository(client);
    });

    it('lists all containers filtered by the compose project label derived from the service name', async () => {
        await repository.listByService(service);

        expect(listContainers).toHaveBeenCalledTimes(1);
        expect(listContainers).toHaveBeenCalledWith({
            all: true,
            filters: { label: ['com.docker.compose.project=my-service'] },
        });
    });

    it('falls back to a service-<id> label when the name slugifies to empty', async () => {
        const unnamed: Service = { ...service, name: '!!!' };

        await repository.listByService(unnamed);

        expect(listContainers).toHaveBeenCalledWith({
            all: true,
            filters: { label: [`com.docker.compose.project=service-${unnamed.id}`] },
        });
    });

    it('maps a full container summary into the domain model', async () => {
        listContainers.mockResolvedValue([containerInfo()]);

        const result = await repository.listByService(service);

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
        listContainers.mockResolvedValue([
            containerInfo({ Ports: [{ PrivatePort: 5432, Type: 'tcp' } as Docker.Port] }),
        ]);

        const [container] = await repository.listByService(service);

        expect(container.ports).toEqual([{ privatePort: 5432, publicPort: null, type: 'tcp' }]);
    });

    it('falls back to the truncated id for the name when Names is missing or empty', async () => {
        listContainers.mockResolvedValue([
            containerInfo({ Names: undefined }),
            containerInfo({ Id: 'zzzzzzzzzzzzffffffffffff', Names: [] }),
        ]);

        const [fromMissing, fromEmpty] = await repository.listByService(service);

        expect(fromMissing.name).toBe('a1b2c3d4e5f6');
        expect(fromEmpty.name).toBe('zzzzzzzzzzzz');
    });

    it('returns an empty ports array when the summary has no ports', async () => {
        listContainers.mockResolvedValue([
            containerInfo({ Ports: undefined }),
            containerInfo({ Ports: [] }),
        ]);

        const [fromUndefined, fromEmpty] = await repository.listByService(service);

        expect(fromUndefined.ports).toEqual([]);
        expect(fromEmpty.ports).toEqual([]);
    });

    it('returns an empty array when the daemon reports no containers', async () => {
        listContainers.mockResolvedValue([]);

        const result = await repository.listByService(service);

        expect(result).toEqual([]);
    });
});
