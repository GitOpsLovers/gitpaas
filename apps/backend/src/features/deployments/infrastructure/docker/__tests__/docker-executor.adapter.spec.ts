import { mkdtemp, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Writable } from 'node:stream';

import DockerodeCompose from 'dockerode-compose';
import * as tar from 'tar';

import { DockerExecutorAdapter } from '../docker-executor.adapter';

import type { AppLogger } from '@core/domain/ports/app-logger.port';
import { DockerContainerRuntimeAdapter } from '@core/infrastructure/docker/docker-container-runtime.adapter';

jest.mock('node:fs/promises');
jest.mock('tar');
jest.mock('dockerode-compose');

/**
 * Holds the instance the mocked `dockerode-compose` constructor returns, so a
 * test can shape the recipe / stub `down`/`up` before driving `up()`.
 */
const mockCompose: { instance: unknown } = { instance: null };

/**
 * The executor keeps every logic-bearing helper private (the class is otherwise
 * pure I/O), so these tests reach the deterministic helpers directly via bracket
 * access rather than driving the full `up()` flow to reach each branch — the
 * class shape (all-private + I/O-bound) justifies the trade-off.
 */
interface ExecutorInternals {
    toNanoseconds: (value: unknown) => number;
    normalizeBuildArgs: (args: unknown) => Record<string, string> | undefined;
    resolveBuild: (build: unknown, baseDir: string) => unknown;
    recipeServices: (compose: unknown) => Record<string, unknown>;
    normalizeHealthchecks: (compose: unknown) => void;
    stampLabels: (compose: unknown, projectName: string) => void;
    buildServices: (
        compose: unknown,
        composeFile: string,
        projectName: string,
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
 * Builds an executor backed by a fake daemon exposing only the members a given
 * test needs (`buildImage`, `pull`, `modem.followProgress`, container
 * `inspect`/`logs`). The injected `DockerContainerRuntimeAdapter` / `AppLogger`
 * collaborators are stored under `mock*` names.
 */
const executorWithDaemon = (fakeDaemon: unknown): DockerExecutorAdapter => {
    const mockContainerRuntime = { getClient: (): unknown => fakeDaemon } as unknown as DockerContainerRuntimeAdapter;
    const mockLogger: jest.Mocked<AppLogger> = {
        debug: jest.fn(), log: jest.fn(), warn: jest.fn(), error: jest.fn(),
    };

    return new DockerExecutorAdapter(mockContainerRuntime, mockLogger);
};

describe('DockerExecutorAdapter', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('toNanoseconds', () => {
        it('passes a raw number through unchanged (assumed nanoseconds)', () => {
            const sut = executorWithDaemon({});

            expect(internals(sut).toNanoseconds(42)).toBe(42);
        });

        it('returns 0 for a non-string/non-number value', () => {
            const sut = executorWithDaemon({});

            expect(internals(sut).toNanoseconds(undefined)).toBe(0);
        });

        it('parses second and millisecond durations', () => {
            const sut = executorWithDaemon({});

            expect(internals(sut).toNanoseconds('5s')).toBe(5e9);
            expect(internals(sut).toNanoseconds('500ms')).toBe(5e8);
        });

        it('sums compound durations and parses hours', () => {
            const sut = executorWithDaemon({});

            expect(internals(sut).toNanoseconds('1m30s')).toBe(90e9);
            expect(internals(sut).toNanoseconds('2h')).toBe(7200e9);
        });

        it('returns 0 for an unparseable string', () => {
            const sut = executorWithDaemon({});

            expect(internals(sut).toNanoseconds('abc')).toBe(0);
        });
    });

    describe('normalizeBuildArgs', () => {
        it('returns undefined when no args are given', () => {
            const sut = executorWithDaemon({});

            expect(internals(sut).normalizeBuildArgs(undefined)).toBeUndefined();
        });

        it('parses the list form, splitting on the first "=" and treating a bare key as empty', () => {
            const sut = executorWithDaemon({});

            const result = internals(sut).normalizeBuildArgs(['KEY=value', 'BARE', 'K=a=b']);

            expect(result).toEqual({ KEY: 'value', BARE: '', K: 'a=b' });
        });

        it('coerces map-form values to strings', () => {
            const sut = executorWithDaemon({});

            const result = internals(sut).normalizeBuildArgs({ A: 1, B: true });

            expect(result).toEqual({ A: '1', B: 'true' });
        });
    });

    describe('resolveBuild', () => {
        it('resolves the string shorthand against the base dir with a default Dockerfile', () => {
            const sut = executorWithDaemon({});

            const result = internals(sut).resolveBuild('app', '/repo');

            expect(result).toEqual({ contextPath: resolve('/repo', 'app'), dockerfile: 'Dockerfile' });
        });

        it('resolves the object form with context, dockerfile, args and target', () => {
            const sut = executorWithDaemon({});

            const result = internals(sut).resolveBuild(
                {
                    context: 'svc', dockerfile: 'Dockerfile.prod', args: ['X=1'], target: 'prod',
                },
                '/repo',
            );

            expect(result).toEqual({
                contextPath: resolve('/repo', 'svc'),
                dockerfile: 'Dockerfile.prod',
                buildargs: { X: '1' },
                target: 'prod',
            });
        });

        it('defaults the context to the base dir when none is given', () => {
            const sut = executorWithDaemon({});

            const result = internals(sut).resolveBuild({}, '/repo') as { contextPath: string };

            expect(result.contextPath).toBe(resolve('/repo', '.'));
        });
    });

    describe('recipeServices', () => {
        it('returns the recipe services when present', () => {
            const sut = executorWithDaemon({});
            const services = { web: { image: 'nginx' } };

            expect(internals(sut).recipeServices({ recipe: { services } })).toBe(services);
        });

        it('returns an empty object when the recipe or its services are missing', () => {
            const sut = executorWithDaemon({});

            expect(internals(sut).recipeServices({})).toEqual({});
            expect(internals(sut).recipeServices({ recipe: {} })).toEqual({});
        });
    });

    describe('normalizeHealthchecks', () => {
        it('rewrites healthcheck durations to nanoseconds and leaves other services untouched', () => {
            const sut = executorWithDaemon({});
            const withCheck = { healthcheck: { interval: '5s', timeout: '2s' } as Record<string, unknown> };
            const withoutCheck = { image: 'nginx' } as { image: string; healthcheck?: unknown };
            const compose = { recipe: { services: { a: withCheck, b: withoutCheck } } };

            internals(sut).normalizeHealthchecks(compose);

            expect(withCheck.healthcheck).toEqual({ interval: 5e9, timeout: 2e9, start_period: 0 });
            expect(withoutCheck.healthcheck).toBeUndefined();
        });
    });

    describe('stampLabels', () => {
        it('stamps the GitPaaS and compose labels on a service with no labels of its own', () => {
            const sut = executorWithDaemon({});
            const web = {} as { labels?: unknown };
            const compose = { recipe: { services: { web } } };

            internals(sut).stampLabels(compose, 'my-project');

            expect(web.labels).toEqual([
                'io.gitpaas.managed=true',
                'io.gitpaas.project=my-project',
                'com.docker.compose.project=my-project',
                'com.docker.compose.service=web',
            ]);
        });

        it('merges into user-declared list-form labels instead of clobbering them', () => {
            const sut = executorWithDaemon({});
            const web = { labels: ['traefik.enable=true', 'bare'] } as { labels?: unknown };
            const compose = { recipe: { services: { web } } };

            internals(sut).stampLabels(compose, 'my-project');

            expect(web.labels).toEqual([
                'traefik.enable=true',
                'bare=',
                'io.gitpaas.managed=true',
                'io.gitpaas.project=my-project',
                'com.docker.compose.project=my-project',
                'com.docker.compose.service=web',
            ]);
        });

        it('normalises user-declared map-form labels into the list form the library parses', () => {
            const sut = executorWithDaemon({});
            const web = { labels: { 'app.tier': 'edge', 'app.replicas': 2 } } as { labels?: unknown };
            const compose = { recipe: { services: { web } } };

            internals(sut).stampLabels(compose, 'my-project');

            expect(web.labels).toEqual([
                'app.tier=edge',
                'app.replicas=2',
                'io.gitpaas.managed=true',
                'io.gitpaas.project=my-project',
                'com.docker.compose.project=my-project',
                'com.docker.compose.service=web',
            ]);
        });

        it('merges the GitPaaS labels as a map into top-level volumes and networks', () => {
            const sut = executorWithDaemon({});
            const compose = {
                recipe: {
                    services: {},
                    volumes: { data: null, cache: { labels: { keep: 'me' } } },
                    networks: { edge: null },
                },
            };

            internals(sut).stampLabels(compose, 'my-project');

            const gitpaas = { 'io.gitpaas.managed': 'true', 'io.gitpaas.project': 'my-project' };
            expect(compose.recipe.volumes.data).toEqual({ labels: gitpaas });
            expect(compose.recipe.volumes.cache).toEqual({ labels: { keep: 'me', ...gitpaas } });
            expect(compose.recipe.networks.edge).toEqual({ labels: gitpaas });
        });

        it('does nothing when the recipe declares no services, volumes or networks', () => {
            const sut = executorWithDaemon({});

            expect(() => { internals(sut).stampLabels({ recipe: {} }, 'my-project'); }).not.toThrow();
            expect(() => { internals(sut).stampLabels({}, 'my-project'); }).not.toThrow();
        });
    });

    describe('buildServices', () => {
        it('stamps the GitPaaS labels on every locally built image and rewrites the service to an image service', async () => {
            const followProgress = jest.fn((_stream, onFinished: (error?: unknown) => void) => { onFinished(); });
            const buildImage = jest.fn().mockResolvedValue({});
            const sut = executorWithDaemon({ buildImage, modem: { followProgress } });
            const web = { build: 'app' } as { build?: unknown; image?: string };
            const cache = { image: 'redis:7' };
            const compose = { recipe: { services: { web, cache } } };

            const built = await internals(sut).buildServices(compose, '/repo/docker-compose.yml', 'my-project', jest.fn());

            expect(buildImage).toHaveBeenCalledTimes(1);

            const [, options] = buildImage.mock.calls[0] as [unknown, Record<string, unknown>];

            expect(options).toEqual({
                t: 'my-project_web',
                dockerfile: 'Dockerfile',
                buildargs: undefined,
                target: undefined,
                labels: { 'io.gitpaas.managed': 'true', 'io.gitpaas.project': 'my-project' },
            });
            expect(built).toEqual(new Set(['my-project_web']));
            expect(web).toEqual({ image: 'my-project_web' });
        });

        it('builds nothing when no service declares a build context', async () => {
            const buildImage = jest.fn();
            const sut = executorWithDaemon({ buildImage, modem: { followProgress: jest.fn() } });
            const compose = { recipe: { services: { cache: { image: 'redis:7' } } } };

            const built = await internals(sut).buildServices(compose, '/repo/docker-compose.yml', 'my-project', jest.fn());

            expect(buildImage).not.toHaveBeenCalled();
            expect(built).toEqual(new Set());
        });
    });

    describe('pullWithProgress', () => {
        it('de-duplicates images, skips built and image-less services, and emits a pulling line each', async () => {
            const followProgress = jest.fn((_stream, onFinished: (error?: unknown) => void) => { onFinished(); });
            const pull = jest.fn().mockResolvedValue({});
            const sut = executorWithDaemon({ pull, modem: { followProgress } });
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

            expect(pull).toHaveBeenCalledTimes(2);
            expect(pull).toHaveBeenNthCalledWith(1, 'redis:7');
            expect(pull).toHaveBeenNthCalledWith(2, 'nginx');
            expect(emit).toHaveBeenCalledWith('▶ Pulling redis:7…');
            expect(emit).toHaveBeenCalledWith('▶ Pulling nginx…');
            expect(emit).not.toHaveBeenCalledWith('▶ Pulling built_web…');
        });

        it('emits a no-images line and never pulls when there is nothing to pull', async () => {
            const pull = jest.fn();
            const sut = executorWithDaemon({ pull, modem: { followProgress: jest.fn() } });
            const emit = jest.fn();
            const compose = { recipe: { services: { a: {}, b: { image: 'built_web' } } } };

            await internals(sut).pullWithProgress(compose, emit, new Set(['built_web']));

            expect(emit).toHaveBeenCalledWith('▹ No registry images to pull.');
            expect(pull).not.toHaveBeenCalled();
        });
    });

    describe('followPull', () => {
        it('rejects when the completion callback reports an error', async () => {
            const followProgress = jest.fn((_stream, onFinished: (error?: unknown) => void) => { onFinished(new Error('boom')); });
            const sut = executorWithDaemon({ modem: { followProgress } });

            await expect(internals(sut).followPull({}, jest.fn())).rejects.toThrow('boom');
        });

        it('resolves when the completion callback reports no error', async () => {
            const followProgress = jest.fn((_stream, onFinished: (error?: unknown) => void) => { onFinished(); });
            const sut = executorWithDaemon({ modem: { followProgress } });

            await expect(internals(sut).followPull({}, jest.fn())).resolves.toBeUndefined();
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
            const sut = executorWithDaemon({ modem: { followProgress } });
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
            const sut = executorWithDaemon({ modem: { followProgress } });

            await expect(internals(sut).followBuild({}, jest.fn())).rejects.toThrow('build failed');
        });

        it('resolves when the completion callback reports no error', async () => {
            const followProgress = jest.fn((_stream, onFinished: (error?: unknown) => void) => { onFinished(); });
            const sut = executorWithDaemon({ modem: { followProgress } });

            await expect(internals(sut).followBuild({}, jest.fn())).resolves.toBeUndefined();
        });
    });

    describe('captureStartupLogs', () => {
        it('emits a name header (leading slash stripped) followed by the log lines', async () => {
            const sut = executorWithDaemon({});
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
            const sut = executorWithDaemon({});
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
        const composeCtor = DockerodeCompose as unknown as jest.Mock;
        const tempDir = '/tmp/gitpaas-deploy-test';

        beforeEach(() => {
            mkdtempMock.mockResolvedValue(tempDir);
            rmMock.mockResolvedValue(undefined);
            // A drain-only writable so `pipeline(source, tar.x())` completes.
            tarXMock.mockReturnValue(new Writable({ objectMode: true, write: (_c, _e, cb): void => { cb(); } }));
            composeCtor.mockImplementation(() => mockCompose.instance);
        });

        it('runs the lifecycle in order for an empty recipe and cleans up the temp dir', async () => {
            const down = jest.fn().mockResolvedValue(undefined);
            const composeUp = jest.fn().mockResolvedValue({ services: [] });
            mockCompose.instance = { recipe: { services: {} }, down, up: composeUp };

            const sut = executorWithDaemon({});
            const onLog = jest.fn();

            await sut.up(Buffer.from('archive'), 'docker-compose.yml', 'test-project', onLog);

            expect(onLog.mock.calls.map((call) => call[0])).toEqual([
                '▶ Extracting repository…',
                '▶ Pulling images…',
                '▹ No registry images to pull.',
                '▶ Removing previous containers…',
                '▶ Creating and starting containers…',
                '✔ Stack "test-project" is up (0 container(s))',
            ]);

            const downOrder = down.mock.invocationCallOrder[0];
            const upOrder = composeUp.mock.invocationCallOrder[0];

            expect(downOrder).toBeLessThan(upOrder);
            expect(rmMock).toHaveBeenCalledWith(tempDir, { recursive: true, force: true });
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
            const sut = executorWithDaemon({ pull: jest.fn().mockResolvedValue({}), modem: { followProgress } });

            await sut.up(Buffer.from('archive'), 'docker-compose.yml', 'test-project', jest.fn());

            const gitpaas = { 'io.gitpaas.managed': 'true', 'io.gitpaas.project': 'test-project' };
            expect(stampedAtUp).toEqual({
                service: [
                    'app.tier=edge',
                    'io.gitpaas.managed=true',
                    'io.gitpaas.project=test-project',
                    'com.docker.compose.project=test-project',
                    'com.docker.compose.service=web',
                ],
                volume: { labels: gitpaas },
                network: { labels: gitpaas },
            });
        });

        it('still cleans up the temp dir when an early step throws', async () => {
            mockCompose.instance = {
                recipe: { services: {} },
                down: jest.fn().mockResolvedValue(undefined),
                up: jest.fn().mockResolvedValue({ services: [] }),
            };
            // Make archive extraction fail before the daemon is touched.
            tarXMock.mockImplementation(() => {
                throw new Error('extract failed');
            });

            const sut = executorWithDaemon({});

            await expect(sut.up(Buffer.from('archive'), 'docker-compose.yml', 'test-project')).rejects.toThrow('extract failed');
            expect(rmMock).toHaveBeenCalledWith(tempDir, { recursive: true, force: true });
        });
    });
});
