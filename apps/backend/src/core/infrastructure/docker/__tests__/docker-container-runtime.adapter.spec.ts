import fs from 'node:fs';
import { Readable } from 'node:stream';

import Docker from 'dockerode';
import DockerodeCompose from 'dockerode-compose';

import { DockerContainerRuntimeAdapter } from '../docker-container-runtime.adapter';

import { GITPAAS_MANAGED_LABEL, GITPAAS_MANAGED_VALUE, GITPAAS_PROJECT_LABEL } from '@core/domain/constants/gitpaas-labels.constants';
import type { RuntimeBuildImageOptions, RuntimeProgressStream } from '@core/domain/models/container-runtime.models';
import type { AppLogger } from '@core/domain/ports/app-logger.port';
import { getGitpaasLabels } from '@shared/application/get-gitpaas-labels.use-case';

/** Stubbed application logger injected into the adapter. */
const buildLogger = (): jest.Mocked<AppLogger> => ({
    debug: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
});

// `dockerode` is replaced by a `jest.fn()` constructor so `new Docker(...)` never
// opens a real connection; we assert the exact options passed to it.
jest.mock('dockerode', () => jest.fn());

// `dockerode-compose` is replaced by a `jest.fn()` constructor so no compose file is
// ever read from disk; we assert the exact arguments the adapter binds it to.
jest.mock('dockerode-compose', () => jest.fn());

const DockerMock = Docker as unknown as jest.Mock;
const DockerodeComposeMock = DockerodeCompose as unknown as jest.Mock;

/** Daemon methods the adapter drives, stubbed on the memoized Dockerode instance. */
interface FakeDaemon {
    ping: jest.Mock;
    info: jest.Mock;
    listContainers: jest.Mock;
    listNetworks: jest.Mock;
    listImages: jest.Mock;
    createNetwork: jest.Mock;
    getContainer: jest.Mock;
    getNetwork: jest.Mock;
    getImage: jest.Mock;
    pruneImages: jest.Mock;
    pruneVolumes: jest.Mock;
    pruneContainers: jest.Mock;
    buildImage: jest.Mock;
    pull: jest.Mock;
    createContainer: jest.Mock;
    modem: { followProgress: jest.Mock };
}

/**
 * `getClient()` is private, so cast through `unknown` to reach the memoized
 * Dockerode client the adapter drives.
 */
const clientOf = (adapter: DockerContainerRuntimeAdapter): Docker => (
    adapter as unknown as { getClient: () => Docker }
).getClient();

/**
 * Builds an adapter whose memoized Dockerode client is the mocked constructor's
 * own instance, with every daemon method the adapter calls stubbed on it. The
 * daemon is therefore driven exactly as in production — through the memoized
 * client — while never touching a socket.
 */
const buildSut = (): { sut: DockerContainerRuntimeAdapter; daemon: FakeDaemon } => {
    const sut = new DockerContainerRuntimeAdapter(buildLogger());
    const daemon = clientOf(sut) as unknown as FakeDaemon;

    daemon.ping = jest.fn().mockResolvedValue(Buffer.from('OK'));
    daemon.info = jest.fn().mockResolvedValue({});
    daemon.listContainers = jest.fn().mockResolvedValue([]);
    daemon.listNetworks = jest.fn().mockResolvedValue([]);
    daemon.listImages = jest.fn().mockResolvedValue([]);
    daemon.createNetwork = jest.fn().mockResolvedValue({ id: 'n-created' });
    daemon.getContainer = jest.fn().mockReturnValue({ remove: jest.fn().mockResolvedValue(undefined) });
    daemon.getNetwork = jest.fn().mockReturnValue({ remove: jest.fn().mockResolvedValue(undefined) });
    daemon.getImage = jest.fn().mockReturnValue({ remove: jest.fn().mockResolvedValue(undefined) });
    daemon.pruneImages = jest.fn().mockResolvedValue({});
    daemon.pruneVolumes = jest.fn().mockResolvedValue({});
    daemon.pruneContainers = jest.fn().mockResolvedValue({});
    daemon.buildImage = jest.fn().mockResolvedValue(Readable.from([]));
    daemon.pull = jest.fn().mockResolvedValue(Readable.from([]));
    daemon.modem = { followProgress: jest.fn() };
    daemon.createContainer = jest.fn().mockResolvedValue({ id: 'c0ffee', start: jest.fn().mockResolvedValue(undefined) });

    return { sut, daemon };
};

/** Builds a build-image option set, overriding only the fields under test. */
const buildOptions = (overrides: Partial<RuntimeBuildImageOptions> = {}): RuntimeBuildImageOptions => ({
    tag: 'gitpaas/my-service:abc1234',
    dockerfile: 'Dockerfile',
    ...overrides,
});

describe('DockerContainerRuntimeAdapter', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getClient', () => {
        it('constructs a Docker client bound to the local unix socket', () => {
            const client = new DockerContainerRuntimeAdapter(buildLogger());

            const result = clientOf(client);

            expect(DockerMock).toHaveBeenCalledTimes(1);
            expect(DockerMock).toHaveBeenCalledWith({ socketPath: '/var/run/docker.sock' });
            expect(result).toBe(DockerMock.mock.instances[0]);
        });

        it('passes the socket path as the only connection option', () => {
            clientOf(new DockerContainerRuntimeAdapter(buildLogger()));

            const [options] = DockerMock.mock.calls[0] as [Record<string, unknown>];

            expect(Object.keys(options)).toEqual(['socketPath']);
        });

        it('never reads TLS material from disk', () => {
            const readFileSync = jest.spyOn(fs, 'readFileSync');
            const existsSync = jest.spyOn(fs, 'existsSync');

            clientOf(new DockerContainerRuntimeAdapter(buildLogger()));

            expect(readFileSync).not.toHaveBeenCalled();
            expect(existsSync).not.toHaveBeenCalled();

            readFileSync.mockRestore();
            existsSync.mockRestore();
        });

        it('needs only the application logger to be constructed', () => {
            expect(DockerContainerRuntimeAdapter).toHaveLength(1);
            expect(() => clientOf(new DockerContainerRuntimeAdapter(buildLogger()))).not.toThrow();
        });

        it('logs the socket it connects to through the injected logger', () => {
            const logger = buildLogger();

            clientOf(new DockerContainerRuntimeAdapter(logger));

            expect(logger.log).toHaveBeenCalledWith(
                'Connecting to the local Docker daemon at /var/run/docker.sock',
                'DockerContainerRuntimeAdapter',
            );
            expect(logger.error).not.toHaveBeenCalled();
            expect(logger.warn).not.toHaveBeenCalled();
        });

        it('logs the connection once only, when the memoized client is created', () => {
            const logger = buildLogger();
            const client = new DockerContainerRuntimeAdapter(logger);

            clientOf(client);
            clientOf(client);

            expect(logger.log).toHaveBeenCalledTimes(1);
        });

        it('memoizes the client, building Docker only once across calls', () => {
            const client = new DockerContainerRuntimeAdapter(buildLogger());

            const first = clientOf(client);
            const second = clientOf(client);

            expect(first).toBe(second);
            expect(DockerMock).toHaveBeenCalledTimes(1);
        });

        it('keeps one client per DockerContainerRuntimeAdapter instance', () => {
            const first = clientOf(new DockerContainerRuntimeAdapter(buildLogger()));
            const second = clientOf(new DockerContainerRuntimeAdapter(buildLogger()));

            expect(DockerMock).toHaveBeenCalledTimes(2);
            expect(first).not.toBe(second);
        });
    });

    describe('label filters sent to the daemon', () => {
        it('scopes a query to GitPaaS-managed resources', async () => {
            const { sut, daemon } = buildSut();

            await sut.pruneImages({ labels: getGitpaasLabels() });

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

            await sut.listNetworks({ labels: getGitpaasLabels(), project: 'my-service' });

            expect(daemon.listNetworks).toHaveBeenCalledWith({
                filters: { label: ['io.gitpaas.managed=true', 'com.docker.compose.project=my-service'] },
            });
        });

        it('emits a bare compose project key for a null project, matching any project at all', async () => {
            const { sut, daemon } = buildSut();

            await sut.listContainers({ labels: getGitpaasLabels(), project: null }, true);

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

            await sut.pruneVolumes({ labels: getGitpaasLabels() });
            await sut.pruneContainers({ labels: getGitpaasLabels(), project: 'my-service' });

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
                    NetworkSettings: { Networks: { 'web-frontend_default': {}, 'gitpaas-proxy': {} } },
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
                    networks: ['web-frontend_default', 'gitpaas-proxy'],
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
                    networks: [],
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

    describe('createNetwork', () => {
        it('creates the network on the name, the driver and the internal flag it received', async () => {
            const { sut, daemon } = buildSut();

            await sut.createNetwork({ name: 'gitpaas-p1-n1', driver: 'bridge', internal: true });

            expect(daemon.createNetwork).toHaveBeenCalledWith({ Name: 'gitpaas-p1-n1', Driver: 'bridge', Internal: true });
        });

        it('returns the identifier of the network the daemon created', async () => {
            const { sut, daemon } = buildSut();
            daemon.createNetwork.mockResolvedValue({ id: 'n-42' });

            await expect(sut.createNetwork({ name: 'gitpaas-p1-n1' })).resolves.toBe('n-42');
        });

        it('leaves the driver to the daemon, and defaults the network to a routed one', async () => {
            const { sut, daemon } = buildSut();

            await sut.createNetwork({ name: 'gitpaas-p1-n1' });

            expect(daemon.createNetwork).toHaveBeenCalledWith({ Name: 'gitpaas-p1-n1', Driver: undefined, Internal: false });
        });

        it('propagates a failure of the daemon that refuses the network', async () => {
            const { sut, daemon } = buildSut();
            const error = new Error('network with name gitpaas-p1-n1 already exists');
            daemon.createNetwork.mockRejectedValue(error);

            await expect(sut.createNetwork({ name: 'gitpaas-p1-n1' })).rejects.toThrow(error);
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

        it('attaches a container to a network by name', async () => {
            const { sut, daemon } = buildSut();
            const connect = jest.fn().mockResolvedValue(undefined);
            daemon.getNetwork.mockReturnValue({ connect });

            await sut.connectNetwork('gitpaas-proxy', 'c1');

            expect(daemon.getNetwork).toHaveBeenCalledWith('gitpaas-proxy');
            expect(connect).toHaveBeenCalledWith({ Container: 'c1' });
        });

        it('attaches a container to a network under the aliases it answers to', async () => {
            const { sut, daemon } = buildSut();
            const connect = jest.fn().mockResolvedValue(undefined);
            daemon.getNetwork.mockReturnValue({ connect });

            await sut.connectNetwork('gitpaas-proxy', 'c1', ['api', 'api-1']);

            expect(connect).toHaveBeenCalledWith({ Container: 'c1', EndpointConfig: { Aliases: ['api', 'api-1'] } });
        });

        it('sends no endpoint configuration when the alias list is empty', async () => {
            const { sut, daemon } = buildSut();
            const connect = jest.fn().mockResolvedValue(undefined);
            daemon.getNetwork.mockReturnValue({ connect });

            await sut.connectNetwork('gitpaas-proxy', 'c1', []);

            expect(connect).toHaveBeenCalledWith({ Container: 'c1' });
        });

        it('force-detaches a container from a network by name', async () => {
            const { sut, daemon } = buildSut();
            const disconnect = jest.fn().mockResolvedValue(undefined);
            daemon.getNetwork.mockReturnValue({ disconnect });

            await sut.disconnectNetwork('gitpaas-proxy', 'c1');

            expect(daemon.getNetwork).toHaveBeenCalledWith('gitpaas-proxy');
            expect(disconnect).toHaveBeenCalledWith({ Container: 'c1', Force: true });
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

    describe('buildImage', () => {
        it('hands the build context straight to the daemon', async () => {
            const { sut, daemon } = buildSut();
            const context = Readable.from(['tarball']);

            await sut.buildImage(context, buildOptions());

            expect(daemon.buildImage).toHaveBeenCalledTimes(1);
            expect(daemon.buildImage.mock.calls[0][0]).toBe(context);
        });

        it('maps the domain build options onto the Docker API keys', async () => {
            const { sut, daemon } = buildSut();

            await sut.buildImage(Readable.from([]), buildOptions({
                tag: 'gitpaas/my-service:abc1234',
                dockerfile: 'docker/Dockerfile',
                buildArgs: { NODE_ENV: 'production' },
                target: 'runtime',
                labels: { [GITPAAS_MANAGED_LABEL]: GITPAAS_MANAGED_VALUE },
            }));

            expect(daemon.buildImage).toHaveBeenCalledWith(expect.anything(), {
                t: 'gitpaas/my-service:abc1234',
                dockerfile: 'docker/Dockerfile',
                buildargs: { NODE_ENV: 'production' },
                target: 'runtime',
                labels: { [GITPAAS_MANAGED_LABEL]: GITPAAS_MANAGED_VALUE },
            });
        });

        it('never leaks the domain option names to the daemon', async () => {
            const { sut, daemon } = buildSut();

            await sut.buildImage(Readable.from([]), buildOptions({ buildArgs: { NODE_ENV: 'production' } }));

            const [, options] = daemon.buildImage.mock.calls[0] as [unknown, Record<string, unknown>];

            expect(Object.keys(options).sort()).toEqual(['buildargs', 'dockerfile', 'labels', 't', 'target']);
            expect(options).not.toHaveProperty('tag');
            expect(options).not.toHaveProperty('buildArgs');
        });

        it('leaves the optional build options undefined when they are not provided', async () => {
            const { sut, daemon } = buildSut();

            await sut.buildImage(Readable.from([]), buildOptions());

            expect(daemon.buildImage).toHaveBeenCalledWith(expect.anything(), {
                t: 'gitpaas/my-service:abc1234',
                dockerfile: 'Dockerfile',
                buildargs: undefined,
                target: undefined,
                labels: undefined,
            });
        });

        it('returns the progress stream the daemon reports', async () => {
            const { sut, daemon } = buildSut();
            const stream = Readable.from(['{"stream":"Step 1/2"}']);
            daemon.buildImage.mockResolvedValue(stream);

            await expect(sut.buildImage(Readable.from([]), buildOptions())).resolves.toBe(stream);
        });

        it('propagates a build failure to the caller', async () => {
            const { sut, daemon } = buildSut();
            const error = new Error('no such file or directory: Dockerfile');
            daemon.buildImage.mockRejectedValue(error);

            await expect(sut.buildImage(Readable.from([]), buildOptions())).rejects.toThrow(error);
        });
    });

    describe('pullImage', () => {
        it('delegates the pull to the daemon with the image reference', async () => {
            const { sut, daemon } = buildSut();

            await sut.pullImage('node:26.1.0-alpine');

            expect(daemon.pull).toHaveBeenCalledTimes(1);
            expect(daemon.pull).toHaveBeenCalledWith('node:26.1.0-alpine');
        });

        it('returns the progress stream the daemon reports', async () => {
            const { sut, daemon } = buildSut();
            const stream = Readable.from(['{"status":"Pulling from library/node"}']);
            daemon.pull.mockResolvedValue(stream);

            await expect(sut.pullImage('node:26.1.0-alpine')).resolves.toBe(stream);
        });

        it('propagates a pull failure to the caller', async () => {
            const { sut, daemon } = buildSut();
            const error = new Error('manifest unknown');
            daemon.pull.mockRejectedValue(error);

            await expect(sut.pullImage('node:does-not-exist')).rejects.toThrow(error);
        });
    });

    describe('followProgress', () => {
        it('forwards the stream and both callbacks to the daemon modem', () => {
            const { sut, daemon } = buildSut();
            const stream: RuntimeProgressStream = Readable.from([]);
            const onFinished = jest.fn();
            const onProgress = jest.fn();

            sut.followProgress(stream, onFinished, onProgress);

            expect(daemon.modem.followProgress).toHaveBeenCalledTimes(1);
            expect(daemon.modem.followProgress).toHaveBeenCalledWith(stream, onFinished, onProgress);
        });

        it('hands the callbacks over by reference, invoking neither of them itself', () => {
            const { sut, daemon } = buildSut();
            const onFinished = jest.fn();
            const onProgress = jest.fn();

            sut.followProgress(Readable.from([]), onFinished, onProgress);

            const [, finished, progress] = daemon.modem.followProgress.mock.calls[0] as [unknown, unknown, unknown];

            expect(finished).toBe(onFinished);
            expect(progress).toBe(onProgress);
            expect(onFinished).not.toHaveBeenCalled();
            expect(onProgress).not.toHaveBeenCalled();
        });

        it('returns nothing, since the modem drives the stream', () => {
            const { sut } = buildSut();

            // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
            const result = sut.followProgress(Readable.from([]), jest.fn(), jest.fn());

            expect(result).toBeUndefined();
        });

        it('propagates an error thrown by the modem', () => {
            const { sut, daemon } = buildSut();
            const error = new Error('stream already consumed');
            daemon.modem.followProgress.mockImplementation(() => {
                throw error;
            });

            expect(() => { sut.followProgress(Readable.from([]), jest.fn(), jest.fn()); }).toThrow(error);
        });
    });

    describe('runDetachedContainer', () => {
        /** The definition of a container the update of the platform runs. */
        const detachedOptions = {
            image: 'docker:28-cli',
            command: ['sh', '-c', 'echo update'],
            binds: ['/opt/gitpaas:/opt/gitpaas', '/var/run/docker.sock:/var/run/docker.sock'],
            labels: { 'com.gitpaas.managed': 'true' },
        };

        it('creates the container on the image, the command, the mounts and the labels it received', async () => {
            const { sut, daemon } = buildSut();

            await sut.runDetachedContainer(detachedOptions);

            expect(daemon.createContainer).toHaveBeenCalledTimes(1);
            expect(daemon.createContainer).toHaveBeenCalledWith({
                Image: 'docker:28-cli',
                Cmd: ['sh', '-c', 'echo update'],
                name: undefined,
                Labels: { 'com.gitpaas.managed': 'true' },
                HostConfig: {
                    Binds: ['/opt/gitpaas:/opt/gitpaas', '/var/run/docker.sock:/var/run/docker.sock'],
                    AutoRemove: false,
                },
            });
        });

        it('starts the container it created, and returns its identifier', async () => {
            const { sut, daemon } = buildSut();
            const container = { id: 'deadbeef', start: jest.fn().mockResolvedValue(undefined) };
            daemon.createContainer.mockResolvedValue(container);

            const result = await sut.runDetachedContainer(detachedOptions);

            expect(container.start).toHaveBeenCalledTimes(1);
            expect(result).toBe('deadbeef');
        });

        it('names the container, and removes it on its exit, when the caller asks for it', async () => {
            const { sut, daemon } = buildSut();

            await sut.runDetachedContainer({ ...detachedOptions, name: 'gitpaas-updater', removeOnExit: true });

            expect(daemon.createContainer).toHaveBeenCalledWith(expect.objectContaining({
                name: 'gitpaas-updater',
                HostConfig: expect.objectContaining({ AutoRemove: true }),
            }));
        });

        it('propagates a failure of the daemon that refuses the container', async () => {
            const { sut, daemon } = buildSut();
            const error = new Error('no such image');
            daemon.createContainer.mockRejectedValue(error);

            await expect(sut.runDetachedContainer(detachedOptions)).rejects.toThrow(error);
        });

        it('propagates a failure of the start of the container', async () => {
            const { sut, daemon } = buildSut();
            const error = new Error('port is already allocated');
            daemon.createContainer.mockResolvedValue({ id: 'c0ffee', start: jest.fn().mockRejectedValue(error) });

            await expect(sut.runDetachedContainer(detachedOptions)).rejects.toThrow(error);
        });
    });

    describe('createComposeProject', () => {
        it('binds the compose project to the memoized client, the compose file and the project name', () => {
            const { sut } = buildSut();

            sut.createComposeProject('/tmp/gitpaas/compose.yml', 'my-service');

            expect(DockerodeComposeMock).toHaveBeenCalledTimes(1);
            expect(DockerodeComposeMock).toHaveBeenCalledWith(
                DockerMock.mock.instances[0],
                '/tmp/gitpaas/compose.yml',
                'my-service',
            );
        });

        it('returns the compose project it built', () => {
            const { sut } = buildSut();

            const result = sut.createComposeProject('/tmp/gitpaas/compose.yml', 'my-service');

            expect(result).toBe(DockerodeComposeMock.mock.instances[0]);
        });

        it('builds one compose project per call, reusing the same client', () => {
            const { sut } = buildSut();

            const first = sut.createComposeProject('/tmp/gitpaas/a.yml', 'a');
            const second = sut.createComposeProject('/tmp/gitpaas/b.yml', 'b');

            expect(DockerodeComposeMock).toHaveBeenCalledTimes(2);
            expect(first).not.toBe(second);
            expect(DockerMock).toHaveBeenCalledTimes(1);
            expect(DockerodeComposeMock.mock.calls[0][0]).toBe(DockerodeComposeMock.mock.calls[1][0]);
        });
    });
});
