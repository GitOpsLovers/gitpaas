/* eslint-disable no-secrets/no-secrets */
import { mkdtemp, rm } from 'node:fs/promises';
import { Writable } from 'node:stream';

import * as tar from 'tar';

import type { DeploymentTarget } from '../../../domain/ports/docker-executor.port';
import { DockerExecutorAdapter } from '../docker-executor.adapter';

import type { AppLogger } from '@core/domain/ports/app-logger.port';
import type { ContainerRuntime } from '@core/domain/ports/container-runtime.port';

jest.mock('node:fs/promises');
jest.mock('tar');

/**
 * Holds the compose project the fake runtime hands back, so a test can shape the
 * recipe / stub `down`/`up` before driving `up()`.
 */
const mockCompose: { instance: unknown } = { instance: null };

/**
 * The executor keeps every I/O step private, so these tests reach each step
 * directly via bracket access rather than driving the full `up()` flow to cover
 * every branch — the class shape (all-private + I/O-bound) justifies the
 * trade-off. The recipe transformations it delegates to are covered by
 * `compose-recipe.transformer.spec.ts`.
 */
interface ExecutorInternals {
    buildServices: (
        compose: unknown,
        composeFile: string,
        projectName: string,
        serviceId: string,
        emit: (line: string) => void,
    ) => Promise<Set<string>>;
    pullWithProgress: (compose: unknown, emit: (line: string) => void, builtImages: Set<string>) => Promise<void>;
    followPull: (stream: unknown, emit: (line: string) => void) => Promise<void>;
    followBuild: (stream: unknown, emit: (line: string) => void) => Promise<void>;
    captureStartupLogs: (container: unknown, emit: (line: string) => void) => Promise<void>;
}

/**
 * Casts the executor to its private surface for direct helper testing.
 */
const internals = (sut: DockerExecutorAdapter): ExecutorInternals => sut as unknown as ExecutorInternals;

/**
 * Builds an executor backed by a fake container runtime exposing only the port
 * members a given test needs (`buildImage`, `pullImage`, `followProgress`,
 * `createComposeProject`). `up()` always looks the leftover networks up, so
 * `listNetworks` answers with none unless a test overrides it. The injected
 * `ContainerRuntime` / `AppLogger` collaborators are stored under `mock*` names.
 */
const executorWithRuntime = (fakeRuntime: unknown): DockerExecutorAdapter => {
    const mockContainerRuntime = {
        listNetworks: jest.fn().mockResolvedValue([]),
        listContainers: jest.fn().mockResolvedValue([]),
        removeContainer: jest.fn().mockResolvedValue(undefined),
        ...fakeRuntime as Record<string, unknown>,
    } as unknown as ContainerRuntime;
    const mockLogger: jest.Mocked<AppLogger> = {
        debug: jest.fn(), log: jest.fn(), warn: jest.fn(), error: jest.fn(),
    };

    return new DockerExecutorAdapter(mockContainerRuntime, mockLogger);
};

describe('DockerExecutorAdapter', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('buildServices', () => {
        it('stamps the GitPaaS labels on every locally built image and rewrites the service to an image service', async () => {
            const followProgress = jest.fn((_stream, onFinished: (error?: unknown) => void) => { onFinished(); });
            const buildImage = jest.fn().mockResolvedValue({});
            const sut = executorWithRuntime({ buildImage, followProgress });
            const web = { build: 'app' } as { build?: unknown; image?: string };
            const cache = { image: 'redis:7' };
            const compose = { recipe: { services: { web, cache } } };

            const built = await internals(sut).buildServices(compose, '/repo/docker-compose.yml', 'my-project', '3f2504e0-4f89-41d3-9a0c-0305e82c3301', jest.fn());

            expect(buildImage).toHaveBeenCalledTimes(1);

            const [, options] = buildImage.mock.calls[0] as [unknown, Record<string, unknown>];

            expect(options).toEqual({
                tag: 'my-project_web',
                dockerfile: 'Dockerfile',
                buildArgs: undefined,
                target: undefined,
                labels: {
                    'io.gitpaas.managed': 'true',
                    'io.gitpaas.project': 'my-project',
                    'com.gitpaas.service': '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
                },
            });
            expect(built).toEqual(new Set(['my-project_web']));
            expect(web).toEqual({ image: 'my-project_web' });
        });

        it('builds nothing when no service declares a build context', async () => {
            const buildImage = jest.fn();
            const sut = executorWithRuntime({ buildImage, followProgress: jest.fn() });
            const compose = { recipe: { services: { cache: { image: 'redis:7' } } } };

            const built = await internals(sut).buildServices(compose, '/repo/docker-compose.yml', 'my-project', '3f2504e0-4f89-41d3-9a0c-0305e82c3301', jest.fn());

            expect(buildImage).not.toHaveBeenCalled();
            expect(built).toEqual(new Set());
        });
    });

    describe('pullWithProgress', () => {
        it('de-duplicates images, skips built and image-less services, and emits a pulling line each', async () => {
            const followProgress = jest.fn((_stream, onFinished: (error?: unknown) => void) => { onFinished(); });
            const pullImage = jest.fn().mockResolvedValue({});
            const sut = executorWithRuntime({ pullImage, followProgress });
            const emit = jest.fn();
            const compose = {
                recipe: {
                    services: {
                        a: { image: 'redis:7' },
                        b: { image: 'redis:7' },
                        c: {},
                        d: { image: 'built_web' },
                        e: { image: 'nginx' },
                    },
                },
            };

            await internals(sut).pullWithProgress(compose, emit, new Set(['built_web']));

            expect(pullImage).toHaveBeenCalledTimes(2);
            expect(pullImage).toHaveBeenNthCalledWith(1, 'redis:7');
            expect(pullImage).toHaveBeenNthCalledWith(2, 'nginx');
            expect(emit).toHaveBeenCalledWith('▶ Pulling redis:7…');
            expect(emit).toHaveBeenCalledWith('▶ Pulling nginx…');
            expect(emit).not.toHaveBeenCalledWith('▶ Pulling built_web…');
        });

        it('emits a no-images line and never pulls when there is nothing to pull', async () => {
            const pullImage = jest.fn();
            const sut = executorWithRuntime({ pullImage, followProgress: jest.fn() });
            const emit = jest.fn();
            const compose = { recipe: { services: { a: {}, b: { image: 'built_web' } } } };

            await internals(sut).pullWithProgress(compose, emit, new Set(['built_web']));

            expect(emit).toHaveBeenCalledWith('▹ No registry images to pull.');
            expect(pullImage).not.toHaveBeenCalled();
        });
    });

    describe('followPull', () => {
        it('rejects when the completion callback reports an error', async () => {
            const followProgress = jest.fn((_stream, onFinished: (error?: unknown) => void) => { onFinished(new Error('boom')); });
            const sut = executorWithRuntime({ followProgress });

            await expect(internals(sut).followPull({}, jest.fn())).rejects.toThrow('boom');
        });

        it('resolves when the completion callback reports no error', async () => {
            const followProgress = jest.fn((_stream, onFinished: (error?: unknown) => void) => { onFinished(); });
            const sut = executorWithRuntime({ followProgress });

            await expect(internals(sut).followPull({}, jest.fn())).resolves.toBeUndefined();
        });

        it('rejects with the error frame of the daemon, although the stream ends without a transport error', async () => {
            const followProgress = jest.fn((
                _stream,
                onFinished: (error?: unknown) => void,
                onProgress: (event: unknown) => void,
            ) => {
                onProgress({ error: 'manifest for redis:99 not found' });
                onFinished();
            });
            const sut = executorWithRuntime({ followProgress });

            await expect(internals(sut).followPull({}, jest.fn())).rejects.toThrow('manifest for redis:99 not found');
        });

        it('emits discrete status lines and skips progress frames and status-less events', async () => {
            const followProgress = jest.fn((
                _stream,
                onFinished: (error?: unknown) => void,
                onProgress: (event: unknown) => void,
            ) => {
                onProgress({ id: 'abc123', status: 'Pulling fs layer' });
                onProgress({ status: 'Downloading' });
                onProgress({ status: 'Downloading', progress: '50%' });
                onProgress({ id: 'abc123' });
                onFinished();
            });
            const sut = executorWithRuntime({ followProgress });
            const emit = jest.fn();

            await internals(sut).followPull({}, emit);

            expect(emit).toHaveBeenCalledTimes(2);
            expect(emit).toHaveBeenNthCalledWith(1, 'abc123: Pulling fs layer');
            expect(emit).toHaveBeenNthCalledWith(2, 'Downloading');
        });
    });

    describe('followBuild', () => {
        it('rejects when the completion callback reports an error', async () => {
            const followProgress = jest.fn((_stream, onFinished: (error?: unknown) => void) => { onFinished(new Error('build failed')); });
            const sut = executorWithRuntime({ followProgress });

            await expect(internals(sut).followBuild({}, jest.fn())).rejects.toThrow('build failed');
        });

        it('resolves when the completion callback reports no error', async () => {
            const followProgress = jest.fn((_stream, onFinished: (error?: unknown) => void) => { onFinished(); });
            const sut = executorWithRuntime({ followProgress });

            await expect(internals(sut).followBuild({}, jest.fn())).resolves.toBeUndefined();
        });

        it('rejects with the error frame of the daemon, although the stream ends without a transport error', async () => {
            const followProgress = jest.fn((
                _stream,
                onFinished: (error?: unknown) => void,
                onProgress: (event: unknown) => void,
            ) => {
                onProgress({ stream: 'Step 4/10 : RUN npm ci' });
                onProgress({
                    error: "The command '/bin/sh -c npm ci' returned a non-zero code: 1",
                    errorDetail: { code: 1, message: "The command '/bin/sh -c npm ci' returned a non-zero code: 1" },
                });
                onFinished();
            });
            const sut = executorWithRuntime({ followProgress });
            const emit = jest.fn();

            await expect(internals(sut).followBuild({}, emit)).rejects.toThrow("The command '/bin/sh -c npm ci' returned a non-zero code: 1");
            expect(emit).toHaveBeenCalledTimes(1);
            expect(emit.mock.calls[0]?.[0]).toBe('Step 4/10 : RUN npm ci');
        });

        it('rejects with the detail message when the error frame carries no summary', async () => {
            const followProgress = jest.fn((
                _stream,
                onFinished: (error?: unknown) => void,
                onProgress: (event: unknown) => void,
            ) => {
                onProgress({ errorDetail: { message: 'COPY failed: file not found' } });
                onFinished();
            });
            const sut = executorWithRuntime({ followProgress });

            await expect(internals(sut).followBuild({}, jest.fn())).rejects.toThrow('COPY failed: file not found');
        });
    });

    describe('captureStartupLogs', () => {
        it('emits a name header (leading slash stripped) followed by the log lines', async () => {
            const sut = executorWithRuntime({});
            const emit = jest.fn();
            const container = {
                id: 'abcdef123456',
                inspect: jest.fn().mockResolvedValue({ Name: '/web', Config: { Tty: true } }),
                logs: jest.fn().mockResolvedValue(Buffer.from('line1\nline2\n', 'utf8')),
            };

            await internals(sut).captureStartupLogs(container, emit);

            // `lines.forEach(emit)` passes (value, index, array), so assert on the first arg only.
            expect(emit.mock.calls.map((call) => call[0])).toEqual(['── web ──', 'line1', 'line2']);
        });

        it('swallows errors (best-effort) without emitting or throwing', async () => {
            const sut = executorWithRuntime({});
            const emit = jest.fn();
            const container = {
                id: 'abcdef123456',
                inspect: jest.fn().mockRejectedValue(new Error('inspect failed')),
                logs: jest.fn(),
            };

            await expect(internals(sut).captureStartupLogs(container, emit)).resolves.toBeUndefined();
            expect(emit).not.toHaveBeenCalled();
        });
    });

    describe('up', () => {
        const mkdtempMock = mkdtemp as jest.Mock;
        const rmMock = rm as jest.Mock;
        const tarXMock = tar.x as unknown as jest.Mock;
        const tempDir = '/tmp/gitpaas-deploy-test';
        // The runtime hands the executor the compose project a test has shaped.
        const createComposeProject = jest.fn(() => mockCompose.instance);
        // One domain of one compose service, as the reverse proxy builds it.
        const routing = { web: { 'traefik.enable': 'true' } };

        /** Builds the stack of the service under test, overriding only the fields under test. */
        const target = (overrides: Partial<DeploymentTarget> = {}): DeploymentTarget => ({
            serviceId: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
            projectName: 'test-project',
            networkAlias: 'my-service',
            ...overrides,
        });

        /** Builds a started container carrying the compose-service label the stack stamped on it. */
        const startedContainer = (composeService: string): Record<string, unknown> => ({
            id: 'container-1',
            inspect: jest.fn().mockResolvedValue({
                Name: `/${composeService}`,
                Config: { Tty: true, Labels: { 'com.docker.compose.service': composeService } },
            }),
            logs: jest.fn().mockResolvedValue(Buffer.from('')),
        });

        beforeEach(() => {
            mkdtempMock.mockResolvedValue(tempDir);
            rmMock.mockResolvedValue(undefined);
            // A drain-only writable so `pipeline(source, tar.x())` completes.
            tarXMock.mockReturnValue(new Writable({ objectMode: true, write: (_c, _e, cb): void => { cb(); } }));
        });

        it('runs the lifecycle in order for an empty recipe and cleans up the temp dir', async () => {
            const composeUp = jest.fn().mockResolvedValue({ services: [] });
            const down = jest.fn().mockResolvedValue(undefined);
            mockCompose.instance = { recipe: { services: {} }, down, up: composeUp };

            const listContainers = jest.fn().mockResolvedValue([]);
            const sut = executorWithRuntime({ createComposeProject, listContainers });
            const onLog = jest.fn();

            await sut.up(Buffer.from('archive'), 'docker-compose.yml', target(), {}, {}, [], onLog);

            expect(onLog.mock.calls.map((call) => call[0])).toEqual([
                '▶ Extracting repository…',
                '▶ Pulling images…',
                '▹ No registry images to pull.',
                '▶ Removing previous containers…',
                '▶ Creating and starting containers…',
                '✔ Stack "test-project" is up (0 container(s))',
            ]);

            const teardownOrder = listContainers.mock.invocationCallOrder[0];
            const upOrder = composeUp.mock.invocationCallOrder[0];

            expect(teardownOrder).toBeLessThan(upOrder);
            expect(rmMock).toHaveBeenCalledWith(tempDir, { recursive: true, force: true });
        });

        it('takes down the containers of the one service, and never the whole compose project', async () => {
            mockCompose.instance = {
                recipe: { services: {} },
                down: jest.fn().mockResolvedValue(undefined),
                up: jest.fn().mockResolvedValue({ services: [] }),
            };

            const listContainers = jest.fn().mockResolvedValue([{ id: 'previous-1' }, { id: 'previous-2' }]);
            const removeContainer = jest.fn().mockResolvedValue(undefined);
            const sut = executorWithRuntime({ createComposeProject, listContainers, removeContainer });

            await sut.up(Buffer.from('archive'), 'docker-compose.yml', target(), {}, {}, [], jest.fn());

            expect(listContainers).toHaveBeenCalledWith(
                { labels: { 'io.gitpaas.managed': 'true' }, service: '3f2504e0-4f89-41d3-9a0c-0305e82c3301' },
                true,
            );
            expect(removeContainer).toHaveBeenCalledTimes(2);
            expect(removeContainer).toHaveBeenCalledWith('previous-1', { force: true });
            expect(removeContainer).toHaveBeenCalledWith('previous-2', { force: true });
        });

        it('reports the previous container it could not remove and still drives the stack up', async () => {
            const composeUp = jest.fn().mockResolvedValue({ services: [] });
            mockCompose.instance = { recipe: { services: {} }, down: jest.fn().mockResolvedValue(undefined), up: composeUp };

            const listContainers = jest.fn().mockResolvedValue([{ id: 'previous-1234567890ab' }]);
            const removeContainer = jest.fn().mockRejectedValue(new Error('container is restarting'));
            const sut = executorWithRuntime({ createComposeProject, listContainers, removeContainer });
            const onLog = jest.fn();

            await expect(
                sut.up(Buffer.from('archive'), 'docker-compose.yml', target(), {}, {}, [], onLog),
            ).resolves.toBeUndefined();

            expect(onLog).toHaveBeenCalledWith('✖ Could not remove the previous container previous-123: container is restarting');
            expect(composeUp).toHaveBeenCalledTimes(1);
        });

        it('takes down the networks of the one service, so a network of the recipe never blocks the next stack', async () => {
            mockCompose.instance = {
                recipe: { services: {} },
                down: jest.fn().mockResolvedValue(undefined),
                up: jest.fn().mockResolvedValue({ services: [] }),
            };

            const listNetworks = jest.fn((selector: { service?: string | null }) => Promise.resolve(
                selector.service === undefined ? [] : [{ id: 'network-edge', name: 'test-project_edge' }],
            ));
            const removeNetwork = jest.fn().mockResolvedValue(undefined);
            const sut = executorWithRuntime({ createComposeProject, listNetworks, removeNetwork });

            await sut.up(Buffer.from('archive'), 'docker-compose.yml', target(), {}, {}, [], jest.fn());

            expect(listNetworks).toHaveBeenCalledWith({
                labels: { 'io.gitpaas.managed': 'true' },
                service: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
            });
            expect(removeNetwork).toHaveBeenCalledWith('network-edge');
        });

        it('reports the network of the service it could not remove and still drives the stack up', async () => {
            const composeUp = jest.fn().mockResolvedValue({ services: [] });
            mockCompose.instance = { recipe: { services: {} }, down: jest.fn().mockResolvedValue(undefined), up: composeUp };

            const listNetworks = jest.fn((selector: { service?: string | null }) => Promise.resolve(
                selector.service === undefined ? [] : [{ id: 'network-edge', name: 'test-project_edge' }],
            ));
            const removeNetwork = jest.fn().mockRejectedValue(new Error('network has active endpoints'));
            const sut = executorWithRuntime({ createComposeProject, listNetworks, removeNetwork });
            const onLog = jest.fn();

            await expect(
                sut.up(Buffer.from('archive'), 'docker-compose.yml', target(), {}, {}, [], onLog),
            ).resolves.toBeUndefined();

            expect(onLog).toHaveBeenCalledWith(
                '✖ Could not remove the previous network test-project_edge: network has active endpoints',
            );
            expect(composeUp).toHaveBeenCalledTimes(1);
        });

        it('has the GitPaaS labels already stamped on services, volumes and networks by the time the stack is created', async () => {
            const web = { image: 'nginx', labels: { 'app.tier': 'edge' } } as { image: string; labels?: unknown };
            const recipe = {
                services: { web },
                volumes: { data: null as unknown },
                networks: { edge: null as unknown },
            };
            let stampedAtUp: unknown;
            const composeUp = jest.fn(() => {
                stampedAtUp = {
                    service: web.labels,
                    volume: recipe.volumes.data,
                    network: recipe.networks.edge,
                };

                return Promise.resolve({ services: [] });
            });
            mockCompose.instance = { recipe, down: jest.fn().mockResolvedValue(undefined), up: composeUp };

            const followProgress = jest.fn((_stream, onFinished: (error?: unknown) => void) => { onFinished(); });
            const sut = executorWithRuntime({ createComposeProject, pullImage: jest.fn().mockResolvedValue({}), followProgress });

            await sut.up(Buffer.from('archive'), 'docker-compose.yml', target(), {}, {}, [], jest.fn());

            const gitpaas = {
                'io.gitpaas.managed': 'true',
                'io.gitpaas.project': 'test-project',
                'com.gitpaas.service': '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
            };
            expect(stampedAtUp).toEqual({
                service: [
                    'app.tier=edge',
                    'io.gitpaas.managed=true',
                    'io.gitpaas.project=test-project',
                    'com.gitpaas.service=3f2504e0-4f89-41d3-9a0c-0305e82c3301',
                    'com.docker.compose.project=test-project',
                    'com.docker.compose.service=web',
                ],
                volume: { labels: gitpaas },
                network: { labels: gitpaas },
            });
        });

        it('has the variables of the service in every service environment by the time the stack is created', async () => {
            const web = { image: 'nginx', environment: ['PORT=8080'] } as { image: string; environment?: unknown };
            let environmentAtUp: unknown;
            const composeUp = jest.fn(() => {
                environmentAtUp = web.environment;

                return Promise.resolve({ services: [] });
            });
            mockCompose.instance = { recipe: { services: { web } }, down: jest.fn().mockResolvedValue(undefined), up: composeUp };

            const followProgress = jest.fn((_stream, onFinished: (error?: unknown) => void) => { onFinished(); });
            const sut = executorWithRuntime({ createComposeProject, pullImage: jest.fn().mockResolvedValue({}), followProgress });

            await sut.up(
                Buffer.from('archive'),
                'docker-compose.yml',
                target(),
                { DATABASE_URL: 'postgres://db' },
                {},
                [],
                jest.fn(),
            );

            expect(environmentAtUp).toEqual(['PORT=8080', 'DATABASE_URL=postgres://db']);
        });

        it('stamps the routing on the named service and attaches its container to the proxy network', async () => {
            const web = { image: 'nginx' } as { image: string; labels?: unknown };
            let labelsAtUp: unknown;
            const container = startedContainer('web');
            const composeUp = jest.fn(() => {
                labelsAtUp = web.labels;

                return Promise.resolve({ services: [container] });
            });
            mockCompose.instance = { recipe: { services: { web } }, down: jest.fn().mockResolvedValue(undefined), up: composeUp };

            const connectNetwork = jest.fn().mockResolvedValue(undefined);
            const followProgress = jest.fn((_stream, onFinished: (error?: unknown) => void) => { onFinished(); });
            const sut = executorWithRuntime({
                createComposeProject, pullImage: jest.fn().mockResolvedValue({}), followProgress, connectNetwork,
            });
            const onLog = jest.fn();

            await sut.up(Buffer.from('archive'), 'docker-compose.yml', target(), {}, routing, [], onLog);

            expect(labelsAtUp).toContain('traefik.enable=true');
            expect(connectNetwork).toHaveBeenCalledTimes(1);
            expect(connectNetwork).toHaveBeenCalledWith('gitpaas-proxy', 'container-1');
            expect(onLog).toHaveBeenCalledWith('▶ Attached web to the network gitpaas-proxy.');
        });

        it('reports the loss and attaches nothing when a domain names a service the recipe no longer holds', async () => {
            const container = startedContainer('api');
            mockCompose.instance = {
                recipe: { services: { api: { image: 'nginx' } } },
                down: jest.fn().mockResolvedValue(undefined),
                up: jest.fn().mockResolvedValue({ services: [container] }),
            };

            const connectNetwork = jest.fn().mockResolvedValue(undefined);
            const followProgress = jest.fn((_stream, onFinished: (error?: unknown) => void) => { onFinished(); });
            const sut = executorWithRuntime({
                createComposeProject, pullImage: jest.fn().mockResolvedValue({}), followProgress, connectNetwork,
            });
            const onLog = jest.fn();

            await sut.up(Buffer.from('archive'), 'docker-compose.yml', target(), {}, routing, [], onLog);

            expect(onLog).toHaveBeenCalledWith('▹ The recipe declares no service "web"; the domains that name it stay unrouted.');
            expect(connectNetwork).not.toHaveBeenCalled();
        });

        it('never touches the proxy network when the service holds no domain', async () => {
            const container = startedContainer('web');
            mockCompose.instance = {
                recipe: { services: { web: { image: 'nginx' } } },
                down: jest.fn().mockResolvedValue(undefined),
                up: jest.fn().mockResolvedValue({ services: [container] }),
            };

            const connectNetwork = jest.fn();
            const followProgress = jest.fn((_stream, onFinished: (error?: unknown) => void) => { onFinished(); });
            const sut = executorWithRuntime({
                createComposeProject, pullImage: jest.fn().mockResolvedValue({}), followProgress, connectNetwork,
            });

            await sut.up(Buffer.from('archive'), 'docker-compose.yml', target(), {}, {}, [], jest.fn());

            expect(connectNetwork).not.toHaveBeenCalled();
        });

        it('reports a failed attachment on the log and still brings the stack up', async () => {
            const container = startedContainer('web');
            mockCompose.instance = {
                recipe: { services: { web: { image: 'nginx' } } },
                down: jest.fn().mockResolvedValue(undefined),
                up: jest.fn().mockResolvedValue({ services: [container] }),
            };

            const connectNetwork = jest.fn().mockRejectedValue(new Error('no such network'));
            const followProgress = jest.fn((_stream, onFinished: (error?: unknown) => void) => { onFinished(); });
            const sut = executorWithRuntime({
                createComposeProject, pullImage: jest.fn().mockResolvedValue({}), followProgress, connectNetwork,
            });
            const onLog = jest.fn();

            await expect(
                sut.up(Buffer.from('archive'), 'docker-compose.yml', target(), {}, routing, [], onLog),
            ).resolves.toBeUndefined();

            expect(onLog).toHaveBeenCalledWith('✖ Could not attach container container-1 to the network gitpaas-proxy: no such network');
            expect(onLog).toHaveBeenCalledWith('✔ Stack "test-project" is up (1 container(s))');
        });

        it('joins every container of the stack to each network of the project, under the slug of the service', async () => {
            const container = startedContainer('web');
            mockCompose.instance = {
                recipe: { services: { web: { image: 'nginx' } } },
                down: jest.fn().mockResolvedValue(undefined),
                up: jest.fn().mockResolvedValue({ services: [container] }),
            };

            const connectNetwork = jest.fn().mockResolvedValue(undefined);
            const followProgress = jest.fn((_stream, onFinished: (error?: unknown) => void) => { onFinished(); });
            const sut = executorWithRuntime({
                createComposeProject, pullImage: jest.fn().mockResolvedValue({}), followProgress, connectNetwork,
            });
            const onLog = jest.fn();

            await sut.up(Buffer.from('archive'), 'docker-compose.yml', target(), {}, {}, ['gitpaas-p-a', 'gitpaas-p-b'], onLog);

            expect(connectNetwork).toHaveBeenCalledTimes(2);
            expect(connectNetwork).toHaveBeenNthCalledWith(1, 'gitpaas-p-a', 'container-1', ['my-service']);
            expect(connectNetwork).toHaveBeenNthCalledWith(2, 'gitpaas-p-b', 'container-1', ['my-service']);
            expect(onLog).toHaveBeenCalledWith('▶ Attached container-1 to the network gitpaas-p-a as my-service.');
        });

        it('keeps the container on the network of the proxy when it also joins a network of the project', async () => {
            const container = startedContainer('web');
            mockCompose.instance = {
                recipe: { services: { web: { image: 'nginx' } } },
                down: jest.fn().mockResolvedValue(undefined),
                up: jest.fn().mockResolvedValue({ services: [container] }),
            };

            const connectNetwork = jest.fn().mockResolvedValue(undefined);
            const disconnectNetwork = jest.fn();
            const followProgress = jest.fn((_stream, onFinished: (error?: unknown) => void) => { onFinished(); });
            const sut = executorWithRuntime({
                createComposeProject, pullImage: jest.fn().mockResolvedValue({}), followProgress, connectNetwork, disconnectNetwork,
            });

            await sut.up(Buffer.from('archive'), 'docker-compose.yml', target(), {}, routing, ['gitpaas-p-a'], jest.fn());

            expect(disconnectNetwork).not.toHaveBeenCalled();
            expect(connectNetwork).toHaveBeenNthCalledWith(1, 'gitpaas-proxy', 'container-1');
            expect(connectNetwork).toHaveBeenNthCalledWith(2, 'gitpaas-p-a', 'container-1', ['my-service']);
        });

        it('reports a network of the project that went away and still brings the stack up', async () => {
            const container = startedContainer('web');
            mockCompose.instance = {
                recipe: { services: { web: { image: 'nginx' } } },
                down: jest.fn().mockResolvedValue(undefined),
                up: jest.fn().mockResolvedValue({ services: [container] }),
            };

            const connectNetwork = jest.fn().mockRejectedValue(new Error('no such network'));
            const followProgress = jest.fn((_stream, onFinished: (error?: unknown) => void) => { onFinished(); });
            const sut = executorWithRuntime({
                createComposeProject, pullImage: jest.fn().mockResolvedValue({}), followProgress, connectNetwork,
            });
            const onLog = jest.fn();

            await expect(
                sut.up(Buffer.from('archive'), 'docker-compose.yml', target(), {}, {}, ['gitpaas-p-a'], onLog),
            ).resolves.toBeUndefined();

            expect(onLog).toHaveBeenCalledWith('✖ Could not attach container container-1 to the network gitpaas-p-a: no such network');
            expect(onLog).toHaveBeenCalledWith('✔ Stack "test-project" is up (1 container(s))');
        });

        it('never touches a network of the project when the service joined none', async () => {
            const container = startedContainer('web');
            mockCompose.instance = {
                recipe: { services: { web: { image: 'nginx' } } },
                down: jest.fn().mockResolvedValue(undefined),
                up: jest.fn().mockResolvedValue({ services: [container] }),
            };

            const connectNetwork = jest.fn();
            const followProgress = jest.fn((_stream, onFinished: (error?: unknown) => void) => { onFinished(); });
            const sut = executorWithRuntime({
                createComposeProject, pullImage: jest.fn().mockResolvedValue({}), followProgress, connectNetwork,
            });

            await sut.up(Buffer.from('archive'), 'docker-compose.yml', target(), {}, {}, [], jest.fn());

            expect(connectNetwork).not.toHaveBeenCalled();
        });

        it('has the default network of the recipe declared by the time the previous containers are removed', async () => {
            const recipe = { services: { web: { image: 'nginx' } } } as { services: unknown; networks?: Record<string, unknown> };
            let networksAtTeardown: unknown;
            // `stampLabels` mutates the networks of the recipe later, so snapshot them at the teardown.
            const listContainers = jest.fn(() => {
                networksAtTeardown = JSON.parse(JSON.stringify(recipe.networks ?? null)) as unknown;

                return Promise.resolve([]);
            });
            mockCompose.instance = {
                recipe,
                down: jest.fn().mockResolvedValue(undefined),
                up: jest.fn().mockResolvedValue({ services: [] }),
            };

            const followProgress = jest.fn((_stream, onFinished: (error?: unknown) => void) => { onFinished(); });
            const sut = executorWithRuntime({
                createComposeProject, listContainers, pullImage: jest.fn().mockResolvedValue({}), followProgress,
            });

            await sut.up(Buffer.from('archive'), 'docker-compose.yml', target(), {}, {}, [], jest.fn());

            expect(networksAtTeardown).toEqual({ default: {} });
        });

        it('has the default network of the stack declared and labelled by the time the stack is created', async () => {
            const recipe = { services: { web: { image: 'nginx' } } } as { services: unknown; networks?: Record<string, unknown> };
            let networksAtUp: unknown;
            const composeUp = jest.fn(() => {
                networksAtUp = recipe.networks;

                return Promise.resolve({ services: [] });
            });
            mockCompose.instance = { recipe, down: jest.fn().mockResolvedValue(undefined), up: composeUp };

            const followProgress = jest.fn((_stream, onFinished: (error?: unknown) => void) => { onFinished(); });
            const sut = executorWithRuntime({ createComposeProject, pullImage: jest.fn().mockResolvedValue({}), followProgress });

            await sut.up(Buffer.from('archive'), 'docker-compose.yml', target(), {}, {}, [], jest.fn());

            expect(networksAtUp).toEqual({
                default: {
                    labels: {
                        'io.gitpaas.managed': 'true',
                        'io.gitpaas.project': 'test-project',
                        'com.gitpaas.service': '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
                    },
                },
            });
        });

        it('removes the network of the project that survived the removal of the previous containers', async () => {
            const down = jest.fn().mockResolvedValue(undefined);
            const composeUp = jest.fn().mockResolvedValue({ services: [] });
            mockCompose.instance = { recipe: { services: {} }, down, up: composeUp };

            // A network of a previous deployment carries no label of the service, so only the read
            // with no service scope reports the leftovers of the host.
            const listNetworks = jest.fn((selector: { service?: string | null }) => Promise.resolve(
                selector.service === undefined
                    ? [{ id: 'network-1', name: 'test-project_default' }, { id: 'network-2', name: 'other-project_default' }]
                    : [],
            ));
            const removeNetwork = jest.fn().mockResolvedValue(undefined);
            const listContainers = jest.fn().mockResolvedValue([]);
            const sut = executorWithRuntime({
                createComposeProject, listNetworks, removeNetwork, listContainers,
            });
            const onLog = jest.fn();

            await sut.up(Buffer.from('archive'), 'docker-compose.yml', target(), {}, {}, [], onLog);

            expect(removeNetwork).toHaveBeenCalledTimes(1);
            expect(removeNetwork).toHaveBeenCalledWith('network-1');
            expect(listContainers.mock.invocationCallOrder[0]).toBeLessThan(removeNetwork.mock.invocationCallOrder[0]);
            expect(removeNetwork.mock.invocationCallOrder[0]).toBeLessThan(composeUp.mock.invocationCallOrder[0]);
        });

        it('never removes a network and stays silent when no network of the project survived', async () => {
            mockCompose.instance = {
                recipe: { services: {} },
                down: jest.fn().mockResolvedValue(undefined),
                up: jest.fn().mockResolvedValue({ services: [] }),
            };

            const listNetworks = jest.fn((selector: { service?: string | null }) => Promise.resolve(
                selector.service === undefined ? [{ id: 'network-2', name: 'other-project_default' }] : [],
            ));
            const removeNetwork = jest.fn();
            const sut = executorWithRuntime({ createComposeProject, listNetworks, removeNetwork });
            const onLog = jest.fn();

            await sut.up(Buffer.from('archive'), 'docker-compose.yml', target(), {}, {}, [], onLog);

            expect(removeNetwork).not.toHaveBeenCalled();
            expect(onLog.mock.calls.map((call) => call[0])).toEqual([
                '▶ Extracting repository…',
                '▶ Pulling images…',
                '▹ No registry images to pull.',
                '▶ Removing previous containers…',
                '▶ Creating and starting containers…',
                '✔ Stack "test-project" is up (0 container(s))',
            ]);
        });

        it('reports the network of the project it could not remove and still drives the stack up', async () => {
            const composeUp = jest.fn().mockResolvedValue({ services: [] });
            mockCompose.instance = { recipe: { services: {} }, down: jest.fn().mockResolvedValue(undefined), up: composeUp };

            const listNetworks = jest.fn((selector: { service?: string | null }) => Promise.resolve(
                selector.service === undefined ? [{ id: 'network-1', name: 'test-project_default' }] : [],
            ));
            const removeNetwork = jest.fn().mockRejectedValue(new Error('network has active endpoints'));
            const sut = executorWithRuntime({ createComposeProject, listNetworks, removeNetwork });
            const onLog = jest.fn();

            await expect(
                sut.up(Buffer.from('archive'), 'docker-compose.yml', target(), {}, {}, [], onLog),
            ).resolves.toBeUndefined();

            expect(onLog).toHaveBeenCalledWith(
                '✖ Could not remove the leftover network test-project_default: network has active endpoints',
            );
            expect(composeUp).toHaveBeenCalledTimes(1);
        });

        it('still cleans up the temp dir when an early step throws', async () => {
            mockCompose.instance = {
                recipe: { services: {} },
                down: jest.fn().mockResolvedValue(undefined),
                up: jest.fn().mockResolvedValue({ services: [] }),
            };
            // Make archive extraction fail before the runtime is touched.
            tarXMock.mockImplementation(() => {
                throw new Error('extract failed');
            });

            const sut = executorWithRuntime({ createComposeProject });

            await expect(sut.up(Buffer.from('archive'), 'docker-compose.yml', target(), {}, {}, [])).rejects.toThrow('extract failed');
            expect(rmMock).toHaveBeenCalledWith(tempDir, { recursive: true, force: true });
        });
    });

    describe('listComposeServices', () => {
        const mkdtempMock = mkdtemp as jest.Mock;
        const rmMock = rm as jest.Mock;
        const tarXMock = tar.x as unknown as jest.Mock;
        const tempDir = '/tmp/gitpaas-recipe-test';

        beforeEach(() => {
            mkdtempMock.mockResolvedValue(tempDir);
            rmMock.mockResolvedValue(undefined);
            tarXMock.mockReturnValue(new Writable({ objectMode: true, write: (_c, _e, cb): void => { cb(); } }));
        });

        it('returns the names of the services of the parsed recipe and cleans up the temp dir', async () => {
            const createComposeProject = jest.fn(() => ({ recipe: { services: { web: {}, cache: {} } } }));
            const sut = executorWithRuntime({ createComposeProject });

            const services = await sut.listComposeServices(Buffer.from('archive'), 'deploy/docker-compose.yml');

            expect(createComposeProject).toHaveBeenCalledWith('/tmp/gitpaas-recipe-test/deploy/docker-compose.yml', 'gitpaas-recipe');
            expect(services).toEqual(['web', 'cache']);
            expect(rmMock).toHaveBeenCalledWith(tempDir, { recursive: true, force: true });
        });

        it('returns an empty list when the recipe declares no service', async () => {
            const createComposeProject = jest.fn(() => ({ recipe: {} }));
            const sut = executorWithRuntime({ createComposeProject });

            await expect(sut.listComposeServices(Buffer.from('archive'), 'docker-compose.yml')).resolves.toEqual([]);
        });

        it('cleans up the temp dir when the recipe cannot be parsed', async () => {
            const createComposeProject = jest.fn(() => {
                throw new Error('bad yaml');
            });
            const sut = executorWithRuntime({ createComposeProject });

            await expect(sut.listComposeServices(Buffer.from('archive'), 'docker-compose.yml')).rejects.toThrow('bad yaml');
            expect(rmMock).toHaveBeenCalledWith(tempDir, { recursive: true, force: true });
        });
    });
});
