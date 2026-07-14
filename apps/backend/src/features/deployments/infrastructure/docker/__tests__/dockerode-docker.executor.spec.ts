import { mkdtemp, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Writable } from 'node:stream';

import DockerodeCompose from 'dockerode-compose';
import * as tar from 'tar';

import { DockerodeDockerExecutor } from '../dockerode-docker.executor';

import { DockerClient } from '@core/infrastructure/docker/docker.client';

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
    pullWithProgress: (compose: unknown, emit: (line: string) => void, builtImages: Set<string>) => Promise<void>;
    followPull: (stream: unknown, emit: (line: string) => void) => Promise<void>;
    followBuild: (stream: unknown, emit: (line: string) => void) => Promise<void>;
    captureStartupLogs: (container: unknown, emit: (line: string) => void) => Promise<void>;
}

/**
 * Casts the executor to its private surface for direct helper testing.
 */
function internals(executor: DockerodeDockerExecutor): ExecutorInternals {
    return executor as unknown as ExecutorInternals;
}

/**
 * Builds an executor backed by a fake daemon exposing only the members a given
 * test needs (`buildImage`, `pull`, `modem.followProgress`).
 */
function executorWithDaemon(fakeDaemon: unknown): DockerodeDockerExecutor {
    const client = { getClient: (): unknown => fakeDaemon } as unknown as DockerClient;

    return new DockerodeDockerExecutor(client);
}

describe('DockerodeDockerExecutor', () => {
    describe('toNanoseconds', () => {
        it('passes a raw number through unchanged (assumed nanoseconds)', () => {
            const executor = executorWithDaemon({});

            expect(internals(executor).toNanoseconds(42)).toBe(42);
        });

        it('returns 0 for a non-string/non-number value', () => {
            const executor = executorWithDaemon({});

            expect(internals(executor).toNanoseconds(undefined)).toBe(0);
        });

        it('parses second and millisecond durations', () => {
            const executor = executorWithDaemon({});

            expect(internals(executor).toNanoseconds('5s')).toBe(5e9);
            expect(internals(executor).toNanoseconds('500ms')).toBe(5e8);
        });

        it('sums compound durations and parses hours', () => {
            const executor = executorWithDaemon({});

            expect(internals(executor).toNanoseconds('1m30s')).toBe(90e9);
            expect(internals(executor).toNanoseconds('2h')).toBe(7200e9);
        });

        it('returns 0 for an unparseable string', () => {
            const executor = executorWithDaemon({});

            expect(internals(executor).toNanoseconds('abc')).toBe(0);
        });
    });

    describe('normalizeBuildArgs', () => {
        it('returns undefined when no args are given', () => {
            const executor = executorWithDaemon({});

            expect(internals(executor).normalizeBuildArgs(undefined)).toBeUndefined();
        });

        it('parses the list form, splitting on the first "=" and treating a bare key as empty', () => {
            const executor = executorWithDaemon({});

            const result = internals(executor).normalizeBuildArgs(['KEY=value', 'BARE', 'K=a=b']);

            expect(result).toEqual({ KEY: 'value', BARE: '', K: 'a=b' });
        });

        it('coerces map-form values to strings', () => {
            const executor = executorWithDaemon({});

            const result = internals(executor).normalizeBuildArgs({ A: 1, B: true });

            expect(result).toEqual({ A: '1', B: 'true' });
        });
    });

    describe('resolveBuild', () => {
        it('resolves the string shorthand against the base dir with a default Dockerfile', () => {
            const executor = executorWithDaemon({});

            const result = internals(executor).resolveBuild('app', '/repo');

            expect(result).toEqual({ contextPath: resolve('/repo', 'app'), dockerfile: 'Dockerfile' });
        });

        it('resolves the object form with context, dockerfile, args and target', () => {
            const executor = executorWithDaemon({});

            const result = internals(executor).resolveBuild(
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
            const executor = executorWithDaemon({});

            const result = internals(executor).resolveBuild({}, '/repo') as { contextPath: string };

            expect(result.contextPath).toBe(resolve('/repo', '.'));
        });
    });

    describe('recipeServices', () => {
        it('returns the recipe services when present', () => {
            const executor = executorWithDaemon({});
            const services = { web: { image: 'nginx' } };

            expect(internals(executor).recipeServices({ recipe: { services } })).toBe(services);
        });

        it('returns an empty object when the recipe or its services are missing', () => {
            const executor = executorWithDaemon({});

            expect(internals(executor).recipeServices({})).toEqual({});
            expect(internals(executor).recipeServices({ recipe: {} })).toEqual({});
        });
    });

    describe('normalizeHealthchecks', () => {
        it('rewrites healthcheck durations to nanoseconds and leaves other services untouched', () => {
            const executor = executorWithDaemon({});
            const withCheck = { healthcheck: { interval: '5s', timeout: '2s' } as Record<string, unknown> };
            const withoutCheck = { image: 'nginx' } as { image: string; healthcheck?: unknown };
            const compose = { recipe: { services: { a: withCheck, b: withoutCheck } } };

            internals(executor).normalizeHealthchecks(compose);

            expect(withCheck.healthcheck).toEqual({ interval: 5e9, timeout: 2e9, start_period: 0 });
            expect(withoutCheck.healthcheck).toBeUndefined();
        });
    });

    describe('pullWithProgress', () => {
        it('de-duplicates images, skips built and image-less services, and emits a pulling line each', async () => {
            const followProgress = jest.fn((_stream, onFinished: (error?: unknown) => void) => { onFinished(); });
            const pull = jest.fn().mockResolvedValue({});
            const executor = executorWithDaemon({ pull, modem: { followProgress } });
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

            await internals(executor).pullWithProgress(compose, emit, new Set(['built_web']));

            expect(pull).toHaveBeenCalledTimes(2);
            expect(pull).toHaveBeenNthCalledWith(1, 'redis:7');
            expect(pull).toHaveBeenNthCalledWith(2, 'nginx');
            expect(emit).toHaveBeenCalledWith('▶ Pulling redis:7…');
            expect(emit).toHaveBeenCalledWith('▶ Pulling nginx…');
            expect(emit).not.toHaveBeenCalledWith('▶ Pulling built_web…');
        });

        it('emits a no-images line and never pulls when there is nothing to pull', async () => {
            const pull = jest.fn();
            const executor = executorWithDaemon({ pull, modem: { followProgress: jest.fn() } });
            const emit = jest.fn();
            const compose = { recipe: { services: { a: {}, b: { image: 'built_web' } } } };

            await internals(executor).pullWithProgress(compose, emit, new Set(['built_web']));

            expect(emit).toHaveBeenCalledWith('▹ No registry images to pull.');
            expect(pull).not.toHaveBeenCalled();
        });
    });

    describe('followPull', () => {
        it('rejects when the completion callback reports an error', async () => {
            const followProgress = jest.fn((_stream, onFinished: (error?: unknown) => void) => { onFinished(new Error('boom')); });
            const executor = executorWithDaemon({ modem: { followProgress } });

            await expect(internals(executor).followPull({}, jest.fn())).rejects.toThrow('boom');
        });

        it('resolves when the completion callback reports no error', async () => {
            const followProgress = jest.fn((_stream, onFinished: (error?: unknown) => void) => { onFinished(); });
            const executor = executorWithDaemon({ modem: { followProgress } });

            await expect(internals(executor).followPull({}, jest.fn())).resolves.toBeUndefined();
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
            const executor = executorWithDaemon({ modem: { followProgress } });
            const emit = jest.fn();

            await internals(executor).followPull({}, emit);

            expect(emit).toHaveBeenCalledTimes(2);
            expect(emit).toHaveBeenNthCalledWith(1, 'abc123: Pulling fs layer');
            expect(emit).toHaveBeenNthCalledWith(2, 'Downloading');
        });
    });

    describe('followBuild', () => {
        it('rejects when the completion callback reports an error', async () => {
            const followProgress = jest.fn((_stream, onFinished: (error?: unknown) => void) => { onFinished(new Error('build failed')); });
            const executor = executorWithDaemon({ modem: { followProgress } });

            await expect(internals(executor).followBuild({}, jest.fn())).rejects.toThrow('build failed');
        });

        it('resolves when the completion callback reports no error', async () => {
            const followProgress = jest.fn((_stream, onFinished: (error?: unknown) => void) => { onFinished(); });
            const executor = executorWithDaemon({ modem: { followProgress } });

            await expect(internals(executor).followBuild({}, jest.fn())).resolves.toBeUndefined();
        });
    });

    describe('captureStartupLogs', () => {
        it('emits a name header (leading slash stripped) followed by the log lines', async () => {
            const executor = executorWithDaemon({});
            const emit = jest.fn();
            const container = {
                id: 'abcdef123456',
                inspect: jest.fn().mockResolvedValue({ Name: '/web', Config: { Tty: true } }),
                logs: jest.fn().mockResolvedValue(Buffer.from('line1\nline2\n', 'utf8')),
            };

            await internals(executor).captureStartupLogs(container, emit);

            // `lines.forEach(emit)` passes (value, index, array), so assert on the first arg only.
            expect(emit.mock.calls.map((call) => call[0])).toEqual(['── web ──', 'line1', 'line2']);
        });

        it('swallows errors (best-effort) without emitting or throwing', async () => {
            const executor = executorWithDaemon({});
            const emit = jest.fn();
            const container = {
                id: 'abcdef123456',
                inspect: jest.fn().mockRejectedValue(new Error('inspect failed')),
                logs: jest.fn(),
            };

            await expect(internals(executor).captureStartupLogs(container, emit)).resolves.toBeUndefined();
            expect(emit).not.toHaveBeenCalled();
        });
    });

    describe('up', () => {
        const mkdtempMock = mkdtemp as jest.Mock;
        const rmMock = rm as jest.Mock;
        const tarXMock = tar.x as unknown as jest.Mock;
        const composeCtor = DockerodeCompose as unknown as jest.Mock;
        const tempDir = '/tmp/artifactory-deploy-test';

        beforeEach(() => {
            jest.clearAllMocks();
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

            const executor = executorWithDaemon({});
            const onLog = jest.fn();

            await executor.up(Buffer.from('archive'), 'docker-compose.yml', 'test-project', onLog);

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

            const executor = executorWithDaemon({});

            await expect(executor.up(Buffer.from('archive'), 'docker-compose.yml', 'test-project')).rejects.toThrow('extract failed');
            expect(rmMock).toHaveBeenCalledWith(tempDir, { recursive: true, force: true });
        });
    });
});
