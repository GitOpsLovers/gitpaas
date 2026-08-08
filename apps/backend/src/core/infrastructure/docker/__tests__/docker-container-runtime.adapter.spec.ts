import fs from 'node:fs';

import Docker from 'dockerode';

import { DockerContainerRuntimeAdapter } from '../docker-container-runtime.adapter';

import { GITPAAS_MANAGED_LABEL, GITPAAS_MANAGED_VALUE, GITPAAS_PROJECT_LABEL } from '@core/domain/constants/gitpaas-labels.constants';
import { getGitpaasResourceLabels } from '@shared/application/get-gitpaas-resource-labels.use-case';

// `dockerode` is replaced by a `jest.fn()` constructor so `new Docker(...)` never
// opens a real connection; we assert the exact options passed to it.
jest.mock('dockerode', () => jest.fn());

const DockerMock = Docker as unknown as jest.Mock;

/** Daemon methods the adapter drives, stubbed on the memoized Dockerode instance. */
interface FakeDaemon {
    ping: jest.Mock;
    info: jest.Mock;
    listContainers: jest.Mock;
    listNetworks: jest.Mock;
    listImages: jest.Mock;
    getContainer: jest.Mock;
    getNetwork: jest.Mock;
    getImage: jest.Mock;
    pruneImages: jest.Mock;
    pruneVolumes: jest.Mock;
    pruneContainers: jest.Mock;
}

/**
 * Builds an adapter whose memoized Dockerode client is the mocked constructor's
 * own instance, with every daemon method the adapter calls stubbed on it. The
 * daemon is therefore driven exactly as in production — through `getClient()` —
 * while never touching a socket.
 */
const buildSut = (): { sut: DockerContainerRuntimeAdapter; daemon: FakeDaemon } => {
    const sut = new DockerContainerRuntimeAdapter();
    const daemon = sut.getClient() as unknown as FakeDaemon;

    daemon.ping = jest.fn().mockResolvedValue(Buffer.from('OK'));
    daemon.info = jest.fn().mockResolvedValue({});
    daemon.listContainers = jest.fn().mockResolvedValue([]);
    daemon.listNetworks = jest.fn().mockResolvedValue([]);
    daemon.listImages = jest.fn().mockResolvedValue([]);
    daemon.getContainer = jest.fn().mockReturnValue({ remove: jest.fn().mockResolvedValue(undefined) });
    daemon.getNetwork = jest.fn().mockReturnValue({ remove: jest.fn().mockResolvedValue(undefined) });
    daemon.getImage = jest.fn().mockReturnValue({ remove: jest.fn().mockResolvedValue(undefined) });
    daemon.pruneImages = jest.fn().mockResolvedValue({});
    daemon.pruneVolumes = jest.fn().mockResolvedValue({});
    daemon.pruneContainers = jest.fn().mockResolvedValue({});

    return { sut, daemon };
};

describe('DockerContainerRuntimeAdapter', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getClient', () => {
        it('constructs a Docker client bound to the local unix socket', () => {
            const client = new DockerContainerRuntimeAdapter();

            const result = client.getClient();

            expect(DockerMock).toHaveBeenCalledTimes(1);
            expect(DockerMock).toHaveBeenCalledWith({ socketPath: '/var/run/docker.sock' });
            expect(result).toBe(DockerMock.mock.instances[0]);
        });

        it('passes the socket path as the only connection option', () => {
            new DockerContainerRuntimeAdapter().getClient();

            const [options] = DockerMock.mock.calls[0] as [Record<string, unknown>];

            expect(Object.keys(options)).toEqual(['socketPath']);
        });

        it('never reads TLS material from disk', () => {
            const readFileSync = jest.spyOn(fs, 'readFileSync');
            const existsSync = jest.spyOn(fs, 'existsSync');

            new DockerContainerRuntimeAdapter().getClient();

            expect(readFileSync).not.toHaveBeenCalled();
            expect(existsSync).not.toHaveBeenCalled();

            readFileSync.mockRestore();
            existsSync.mockRestore();
        });

        it('needs no injected dependencies to be constructed', () => {
            expect(DockerContainerRuntimeAdapter).toHaveLength(0);
            expect(() => new DockerContainerRuntimeAdapter().getClient()).not.toThrow();
        });

        it('memoizes the client, building Docker only once across calls', () => {
            const client = new DockerContainerRuntimeAdapter();

            const first = client.getClient();
            const second = client.getClient();

            expect(first).toBe(second);
            expect(DockerMock).toHaveBeenCalledTimes(1);
        });

        it('keeps one client per DockerContainerRuntimeAdapter instance', () => {
            const first = new DockerContainerRuntimeAdapter().getClient();
            const second = new DockerContainerRuntimeAdapter().getClient();

            expect(DockerMock).toHaveBeenCalledTimes(2);
            expect(first).not.toBe(second);
        });
    });

    describe('label filters sent to the daemon', () => {
        it('scopes a query to GitPaaS-managed resources', async () => {
            const { sut, daemon } = buildSut();

            await sut.pruneImages({ labels: getGitpaasResourceLabels() });

            expect(daemon.pruneImages).toHaveBeenCalledWith({ filters: { label: ['io.gitpaas.managed=true'] } });
        });

        it('adds the GitPaaS project label to the marker', async () => {
            const { sut, daemon } = buildSut();

            const labels = { [GITPAAS_MANAGED_LABEL]: GITPAAS_MANAGED_VALUE, [GITPAAS_PROJECT_LABEL]: 'my-service' };

            await sut.listImages({ labels });

            expect(daemon.listImages).toHaveBeenCalledWith({
                filters: { label: ['io.gitpaas.managed=true', 'io.gitpaas.project=my-service'] },
            });
        });

        it('maps a project scope onto the compose project label, keeping the marker', async () => {
            const { sut, daemon } = buildSut();

            await sut.listNetworks({ labels: getGitpaasResourceLabels(), project: 'my-service' });

            expect(daemon.listNetworks).toHaveBeenCalledWith({
                filters: { label: ['io.gitpaas.managed=true', 'com.docker.compose.project=my-service'] },
            });
        });

        it('emits a bare compose project key for a null project, matching any project at all', async () => {
            const { sut, daemon } = buildSut();

            await sut.listContainers({ labels: getGitpaasResourceLabels(), project: null }, true);

            expect(daemon.listContainers).toHaveBeenCalledWith({
                all: true,
                filters: { label: ['io.gitpaas.managed=true', 'com.docker.compose.project'] },
            });
        });

        it('sends an empty filter when the selector is empty', async () => {
            const { sut, daemon } = buildSut();

            await sut.listNetworks({});

            expect(daemon.listNetworks).toHaveBeenCalledWith({ filters: { label: [] } });
        });

        it('scopes the volume and container prunes to the same serialised filter', async () => {
            const { sut, daemon } = buildSut();

            await sut.pruneVolumes({ labels: getGitpaasResourceLabels() });
            await sut.pruneContainers({ labels: getGitpaasResourceLabels(), project: 'my-service' });

            expect(daemon.pruneVolumes).toHaveBeenCalledWith({ filters: { label: ['io.gitpaas.managed=true'] } });
            expect(daemon.pruneContainers).toHaveBeenCalledWith({
                filters: { label: ['io.gitpaas.managed=true', 'com.docker.compose.project=my-service'] },
            });
        });
    });

    describe('ping', () => {
        it('returns true when the daemon answers with an "OK" buffer', async () => {
            const { sut, daemon } = buildSut();
            daemon.ping.mockResolvedValue(Buffer.from('OK'));

            await expect(sut.ping()).resolves.toBe(true);
            expect(daemon.ping).toHaveBeenCalledTimes(1);
        });

        it('returns true when the daemon answers with an "OK" string', async () => {
            const { sut, daemon } = buildSut();
            daemon.ping.mockResolvedValue('OK');

            await expect(sut.ping()).resolves.toBe(true);
        });

        it('returns false when the daemon answers with a non-OK payload', async () => {
            const { sut, daemon } = buildSut();
            daemon.ping.mockResolvedValue(Buffer.from('pong'));

            await expect(sut.ping()).resolves.toBe(false);
        });

        it('returns false when the daemon answers with an empty payload', async () => {
            const { sut, daemon } = buildSut();
            daemon.ping.mockResolvedValue(Buffer.from(''));

            await expect(sut.ping()).resolves.toBe(false);
        });

        it('propagates errors thrown while pinging the daemon', async () => {
            const { sut, daemon } = buildSut();
            const error = new Error('docker daemon unreachable');
            daemon.ping.mockRejectedValue(error);

            await expect(sut.ping()).rejects.toThrow(error);
        });
    });

    describe('info', () => {
        it('maps the daemon payload into the container runtime info model', async () => {
            const { sut, daemon } = buildSut();
            daemon.info.mockResolvedValue({
                ServerVersion: '27.1.1',
                OperatingSystem: 'Ubuntu 24.04',
                Containers: 4,
                Images: 12,
            });

            await expect(sut.info()).resolves.toEqual({
                serverVersion: '27.1.1',
                operatingSystem: 'Ubuntu 24.04',
                containers: 4,
                images: 12,
            });
            expect(daemon.info).toHaveBeenCalledWith();
        });

        it('propagates errors thrown while querying the daemon info', async () => {
            const { sut, daemon } = buildSut();
            const error = new Error('docker daemon unreachable');
            daemon.info.mockRejectedValue(error);

            await expect(sut.info()).rejects.toThrow(error);
        });
    });

    describe('listContainers', () => {
        it('narrows every container the daemon reports through the transformer', async () => {
            const { sut, daemon } = buildSut();
            daemon.listContainers.mockResolvedValue([
                {
                    Id: 'a1b2c3d4e5f6a1b2c3d4e5f6',
                    Names: ['/web-frontend-app-1'],
                    Image: 'web-frontend_app',
                    State: 'running',
                    Status: 'Up 3 minutes',
                    Created: 1_752_192_000,
                    Labels: { 'io.gitpaas.project': 'web-frontend', 'com.docker.compose.project': 'web-frontend' },
                    Ports: [{ PrivatePort: 3000, PublicPort: 8080, Type: 'tcp' }],
                },
                { Id: 'bare', Created: 0 },
            ]);

            await expect(sut.listContainers({})).resolves.toEqual([
                {
                    id: 'a1b2c3d4e5f6a1b2c3d4e5f6',
                    names: ['/web-frontend-app-1'],
                    image: 'web-frontend_app',
                    state: 'running',
                    status: 'Up 3 minutes',
                    createdAt: new Date(1_752_192_000 * 1000),
                    projects: ['web-frontend', 'web-frontend'],
                    ports: [{ privatePort: 3000, publicPort: 8080, type: 'tcp' }],
                },
                {
                    id: 'bare',
                    names: [],
                    image: undefined,
                    state: undefined,
                    status: undefined,
                    createdAt: new Date(0),
                    projects: [],
                    ports: [],
                },
            ]);
        });

        it('lists stopped containers too only when asked to', async () => {
            const { sut, daemon } = buildSut();

            await sut.listContainers({}, true);
            await sut.listContainers({});

            expect(daemon.listContainers).toHaveBeenNthCalledWith(1, { all: true, filters: { label: [] } });
            expect(daemon.listContainers).toHaveBeenNthCalledWith(2, { all: false, filters: { label: [] } });
        });
    });

    describe('listNetworks', () => {
        it('narrows every network the daemon reports through the transformer', async () => {
            const { sut, daemon } = buildSut();
            daemon.listNetworks.mockResolvedValue([{
                Id: 'n-1',
                Name: 'my-service_default',
                Driver: 'bridge',
                Scope: 'local',
                Internal: false,
                Attachable: true,
                Created: '2025-07-11T00:00:00.000Z',
            }]);

            await expect(sut.listNetworks({})).resolves.toEqual([{
                id: 'n-1',
                name: 'my-service_default',
                driver: 'bridge',
                scope: 'local',
                internal: false,
                attachable: true,
                createdAt: new Date('2025-07-11T00:00:00.000Z'),
            }]);
        });
    });

    describe('listImages', () => {
        it('exposes the identifier of every image the daemon reports', async () => {
            const { sut, daemon } = buildSut();
            daemon.listImages.mockResolvedValue([{ Id: 'img-a' }, { Id: 'img-b' }]);

            await expect(sut.listImages({})).resolves.toEqual([{ id: 'img-a' }, { id: 'img-b' }]);
        });
    });

    describe('removals', () => {
        it('force-removes a container with its anonymous volumes', async () => {
            const { sut, daemon } = buildSut();
            const remove = jest.fn().mockResolvedValue(undefined);
            daemon.getContainer.mockReturnValue({ remove });

            await sut.removeContainer('c1', { force: true, removeVolumes: true });

            expect(daemon.getContainer).toHaveBeenCalledWith('c1');
            expect(remove).toHaveBeenCalledWith({ force: true, v: true });
        });

        it('defaults a container removal to neither forcing nor dropping volumes', async () => {
            const { sut, daemon } = buildSut();
            const remove = jest.fn().mockResolvedValue(undefined);
            daemon.getContainer.mockReturnValue({ remove });

            await sut.removeContainer('c1');

            expect(remove).toHaveBeenCalledWith({ force: false, v: false });
        });

        it('removes a network by id', async () => {
            const { sut, daemon } = buildSut();
            const remove = jest.fn().mockResolvedValue(undefined);
            daemon.getNetwork.mockReturnValue({ remove });

            await sut.removeNetwork('n1');

            expect(daemon.getNetwork).toHaveBeenCalledWith('n1');
            expect(remove).toHaveBeenCalledWith();
        });

        it('force-removes an image by id', async () => {
            const { sut, daemon } = buildSut();
            const remove = jest.fn().mockResolvedValue(undefined);
            daemon.getImage.mockReturnValue({ remove });

            await sut.removeImage('img', { force: true });

            expect(daemon.getImage).toHaveBeenCalledWith('img');
            expect(remove).toHaveBeenCalledWith({ force: true });
        });

        it('defaults an image removal to a non-forced one', async () => {
            const { sut, daemon } = buildSut();
            const remove = jest.fn().mockResolvedValue(undefined);
            daemon.getImage.mockReturnValue({ remove });

            await sut.removeImage('img');

            expect(remove).toHaveBeenCalledWith({ force: false });
        });

        it('propagates a removal failure to the caller', async () => {
            const { sut, daemon } = buildSut();
            const error = new Error('container is restarting');
            daemon.getContainer.mockReturnValue({ remove: jest.fn().mockRejectedValue(error) });

            await expect(sut.removeContainer('c1', { force: true })).rejects.toThrow(error);
        });
    });

    describe('prunes', () => {
        it('reports the images the daemon deleted, reading its own response field', async () => {
            const { sut, daemon } = buildSut();
            daemon.pruneImages.mockResolvedValue({ ImagesDeleted: [{}, {}, {}], SpaceReclaimed: 1024 });

            await expect(sut.pruneImages({})).resolves.toEqual({ deletedCount: 3, spaceReclaimed: 1024 });
        });

        it('reports the volumes the daemon deleted, reading its own response field', async () => {
            const { sut, daemon } = buildSut();
            daemon.pruneVolumes.mockResolvedValue({ VolumesDeleted: ['vol-0', 'vol-1'], SpaceReclaimed: 2048 });

            await expect(sut.pruneVolumes({})).resolves.toEqual({ deletedCount: 2, spaceReclaimed: 2048 });
        });

        it('reports the containers the daemon deleted, reading its own response field', async () => {
            const { sut, daemon } = buildSut();
            daemon.pruneContainers.mockResolvedValue({ ContainersDeleted: ['ctr-0'], SpaceReclaimed: 4096 });

            await expect(sut.pruneContainers({})).resolves.toEqual({ deletedCount: 1, spaceReclaimed: 4096 });
        });

        it.each([
            ['an empty response', {}],
            ['a null-valued response', { ImagesDeleted: null, SpaceReclaimed: null }],
        ])('falls back to zeroed counters for %s', async (_case, response) => {
            const { sut, daemon } = buildSut();
            daemon.pruneImages.mockResolvedValue(response);

            await expect(sut.pruneImages({})).resolves.toEqual({ deletedCount: 0, spaceReclaimed: 0 });
        });
    });
});
