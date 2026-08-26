import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import { Inject, Injectable } from '@nestjs/common';
import * as tar from 'tar';

import { DockerExecutor, DockerLogListener } from '../../domain/ports/docker-executor.port';

import {
    injectEnvironment, normalizeHealthchecks, recipeServices, resolveBuild, stampLabels, stampRouting,
} from './compose-recipe.transformer';
import type { ResolvedBuild } from './compose-recipe.transformer';
import { decodeDockerLogBuffer, toLogLines } from './docker-log.util';

import type { RuntimeComposeProject, RuntimeProgressListener } from '@core/domain/models/container-runtime.models';
import type { AppLogger } from '@core/domain/ports/app-logger.port';
import type { ContainerRuntime } from '@core/domain/ports/container-runtime.port';
import { DockerContainerRuntimeAdapter } from '@core/infrastructure/docker/docker-container-runtime.adapter';
import { COMPOSE_SERVICE_LABEL } from '@core/infrastructure/docker/docker-container-runtime.transformer';
import { NestLoggerAdapter } from '@core/infrastructure/logging/nest-logger.adapter';
import { recordDependencyCall } from '@core/infrastructure/telemetry/telemetry-deps';
import type { RoutingLabels } from '@features/domains/domain/ports/reverse-proxy.port';
import { PROXY_NETWORK } from '@features/domains/infrastructure/traefik/traefik-reverse-proxy.constants';
import { getGitpaasLabels } from '@shared/application/get-gitpaas-labels.use-case';

/**
 * Number of trailing startup log lines captured per container after it starts.
 */
const STARTUP_LOG_TAIL = 100;

/**
 * Project name the throwaway compose project of a recipe reading is bound to.
 */
const RECIPE_PROJECT_NAME = 'gitpaas-recipe';

/**
 * The subset of a started container the executor reads its startup output from.
 */
interface StartedContainer {
    id: string;
    inspect: () => Promise<{ Name: string; Config: { Tty: boolean; Labels?: Record<string, string> } }>;
    logs: (options: { follow: false; stdout: boolean; stderr: boolean; tail: number; timestamps: boolean }) => Promise<Buffer>;
}

/**
 * Docker executor adapter
 */
@Injectable()
export class DockerExecutorAdapter implements DockerExecutor {
    constructor(
        @Inject(DockerContainerRuntimeAdapter)
        private readonly docker: ContainerRuntime,
        @Inject(NestLoggerAdapter)
        private readonly logger: AppLogger,
    ) {}

    public async up(
        archive: Buffer,
        composePath: string,
        projectName: string,
        environment: Record<string, string>,
        routing: RoutingLabels,
        onLog?: DockerLogListener,
    ): Promise<void> {
        const emit = (line: string): void => onLog?.(line);
        const directory = await mkdtemp(join(tmpdir(), 'gitpaas-deploy-'));

        try {
            emit('▶ Extracting repository…');
            await this.extractArchive(archive, directory);

            const composeFile = join(directory, composePath);
            const compose = this.docker.createComposeProject(composeFile, projectName);

            // Build local `build:` services first (streaming their output), which
            // rewrites them into plain image services in the recipe.
            const builtImages = await this.buildServices(compose, composeFile, projectName, emit);

            emit('▶ Pulling images…');

            await this.pullWithProgress(compose, emit, builtImages);

            emit('▶ Removing previous containers…');
            await this.run(() => compose.down());

            normalizeHealthchecks(compose);
            stampLabels(compose, projectName);

            const routed = this.applyRouting(compose, routing, emit);

            injectEnvironment(compose, environment);

            emit('▶ Creating and starting containers…');

            const result = (await this.run(() => compose.up())) as { services?: StartedContainer[] };
            const containers = result.services ?? [];

            // `dockerode-compose` crashes on an `external` network of the recipe, so the routed
            // containers join the network of the proxy once the stack is already up.
            await this.attachToProxy(containers, routed, emit);

            for (const container of containers) {
                await this.captureStartupLogs(container, emit);
            }

            emit(`✔ Stack "${projectName}" is up (${containers.length} container(s))`);
        } finally {
            await rm(directory, { recursive: true, force: true });
        }
    }

    public async listComposeServices(archive: Buffer, composePath: string): Promise<string[]> {
        const directory = await mkdtemp(join(tmpdir(), 'gitpaas-recipe-'));

        try {
            await this.extractArchive(archive, directory);

            // The compose project parses the recipe as it is built, and nothing drives the stack.
            const compose = this.docker.createComposeProject(join(directory, composePath), RECIPE_PROJECT_NAME);

            return Object.keys(recipeServices(compose));
        } finally {
            await rm(directory, { recursive: true, force: true });
        }
    }

    /**
     * Stamps the labels of the routing on the recipe.
     *
     * @param compose Compose project driven by the container runtime
     * @param routing Labels of the routing, grouped by the compose service each domain names
     * @param emit Line emitter
     *
     * @returns The names of the compose services that carry the routing
     */
    private applyRouting(compose: RuntimeComposeProject, routing: RoutingLabels, emit: DockerLogListener): Set<string> {
        const stamped = new Set(stampRouting(compose, routing));

        for (const name of Object.keys(routing)) {
            if (!stamped.has(name)) {
                emit(`▹ The recipe declares no service "${name}"; the domains that name it stay unrouted.`);
            }
        }

        return stamped;
    }

    /**
     * Attaches every routed container of a started stack to the network of the proxy.
     *
     * @param containers Started containers of the stack
     * @param routed Names of the compose services that carry the routing
     * @param emit Line emitter
     */
    private async attachToProxy(containers: StartedContainer[], routed: Set<string>, emit: DockerLogListener): Promise<void> {
        if (routed.size === 0) {
            return;
        }

        for (const container of containers) {
            try {
                const info = await this.run(() => container.inspect());
                // eslint-disable-next-line security/detect-object-injection
                const name = info.Config.Labels?.[COMPOSE_SERVICE_LABEL];

                if (name === undefined || !routed.has(name)) {
                    continue;
                }

                await this.docker.connectNetwork(PROXY_NETWORK, container.id);

                emit(`▶ Attached ${name} to the network ${PROXY_NETWORK}.`);
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);

                emit(`✖ Could not attach container ${container.id.slice(0, 12)} to the network ${PROXY_NETWORK}: ${message}`);
                this.logger.warn(
                    `Could not attach container ${container.id} to the network ${PROXY_NETWORK}: ${message}`,
                    DockerExecutorAdapter.name,
                );
            }
        }
    }

    /**
     * Extracts a gzipped repository tarball into a directory
     *
     * @param archive Gzipped tarball bytes
     * @param directory Destination directory
     */
    private async extractArchive(archive: Buffer, directory: string): Promise<void> {
        await pipeline(Readable.from(archive), tar.x({ cwd: directory, strip: 1 }));
    }

    /**
     * Builds every service that declares a local `build:` context.
     *
     * @param compose Compose project driven by the container runtime
     * @param composeFile Absolute path to the compose file (build contexts are relative to its dir)
     * @param projectName Compose project name, used to tag built images
     * @param emit Line emitter
     *
     * @returns The set of image tags that were built locally (never pulled from a registry)
     */
    private async buildServices(
        compose: RuntimeComposeProject,
        composeFile: string,
        projectName: string,
        emit: DockerLogListener,
    ): Promise<Set<string>> {
        const services = recipeServices(compose);
        const baseDir = dirname(composeFile);
        const built = new Set<string>();

        for (const [name, service] of Object.entries(services)) {
            if (service.build == null) {
                continue;
            }

            const tag = `${projectName}_${name}`;
            const build = resolveBuild(service.build, baseDir);

            emit(`▶ Building ${name} (${tag})…`);

            await this.buildImage(build, tag, projectName, emit);

            // Treat the freshly built image as a normal image service: `up()` will run
            // it and the pull step will skip it (it isn't in any registry).
            service.image = tag;
            delete service.build;
            built.add(tag);
        }

        return built;
    }

    /**
     * Builds one image on the daemon from a local context, streaming build output.
     *
     * @param build Resolved build definition
     * @param tag Image tag to apply
     * @param projectName Compose project name, stamped on the image as a GitPaaS label
     * @param emit Line emitter
     */
    private async buildImage(build: ResolvedBuild, tag: string, projectName: string, emit: DockerLogListener): Promise<void> {
        // `tar.c` returns a Minipass `Pack` stream — runtime-compatible with, but not
        // structurally typed as, a Node readable, so cast for dockerode's signature.
        const context = tar.c({ cwd: build.contextPath, gzip: false }, ['.']) as unknown as NodeJS.ReadableStream;

        const stream = await this.docker.buildImage(context, {
            tag,
            dockerfile: build.dockerfile,
            buildArgs: build.buildargs,
            target: build.target,
            labels: getGitpaasLabels(projectName),
        });

        await this.followBuild(stream, emit);
    }

    /**
     * Follows a build output stream, emitting build log lines and rejecting on a
     * build error.
     *
     * @param stream Build progress stream
     * @param emit Line emitter
     */
    private followBuild(stream: NodeJS.ReadableStream, emit: DockerLogListener): Promise<void> {
        return this.followProgress(stream, (event) => {
            const text = event.stream ?? event.status;

            if (text) {
                toLogLines(text).forEach(emit);
            }
        });
    }

    /**
     * Pulls the stack's registry images, forwarding the daemon's pull progress to `emit`.
     *
     * Skips locally-built images (they exist on the daemon, not in a registry) and
     * services without an `image`.
     *
     * @param compose Compose project driven by the container runtime
     * @param emit Line emitter
     * @param builtImages Image tags built locally, which must not be pulled
     */
    private async pullWithProgress(compose: RuntimeComposeProject, emit: DockerLogListener, builtImages: Set<string>): Promise<void> {
        const services = recipeServices(compose);

        const images = [...new Set(
            Object.values(services)
                .map((service) => service.image)
                .filter((image): image is string => typeof image === 'string' && image.length > 0),
        )].filter((image) => !builtImages.has(image));

        if (images.length === 0) {
            emit('▹ No registry images to pull.');

            return;
        }

        await Promise.all(images.map(async (image) => {
            emit(`▶ Pulling ${image}…`);

            const stream = await this.docker.pullImage(image);

            await this.followPull(stream, emit);
        }));
    }

    /**
     * Follows a single image pull stream, emitting discrete status lines.
     *
     * @param stream Pull progress stream
     * @param emit Line emitter
     */
    private followPull(stream: NodeJS.ReadableStream, emit: DockerLogListener): Promise<void> {
        return this.followProgress(stream, (event) => {
            // Skip byte-level progress frames; keep discrete lifecycle lines.
            if (!event.status || event.progress) {
                return;
            }

            emit(event.id ? `${event.id}: ${event.status}` : event.status);
        });
    }

    /**
     * Follows a progress stream of the daemon to its end, forwarding every frame to `onEvent`.
     *
     * @param stream Progress stream of the daemon
     * @param onEvent Listener of every frame that carries no error
     */
    private followProgress(stream: NodeJS.ReadableStream, onEvent: RuntimeProgressListener): Promise<void> {
        return new Promise((resolvePromise, reject) => {
            let failure: Error | undefined;

            this.docker.followProgress(
                stream,
                (error) => {
                    if (error) {
                        reject(error instanceof Error ? error : new Error(JSON.stringify(error)));
                    } else if (failure) {
                        reject(failure);
                    } else {
                        resolvePromise();
                    }
                },
                (event) => {
                    const message = event.error ?? event.errorDetail?.message;

                    if (message) {
                        failure = new Error(message);

                        return;
                    }

                    onEvent(event);
                },
            );
        });
    }

    /**
     * Emits a bounded snapshot of a container's startup output.
     *
     * @param container Started container
     * @param emit Line emitter
     */
    private async captureStartupLogs(container: StartedContainer, emit: DockerLogListener): Promise<void> {
        try {
            const info = await this.run(() => container.inspect());
            const name = info.Name.replace(/^\//, '') || container.id.slice(0, 12);

            const raw = await this.run(() => container.logs({
                follow: false,
                stdout: true,
                stderr: true,
                tail: STARTUP_LOG_TAIL,
                timestamps: false,
            }));

            const text = info.Config.Tty ? raw.toString('utf8') : decodeDockerLogBuffer(raw);
            const lines = toLogLines(text);

            emit(`── ${name} ──`);
            lines.forEach(emit);
        } catch (error) {
            // Startup logs are best-effort; a failure here must not fail the deploy.
            this.logger.warn(`Could not read startup logs for container ${container.id}: ${String(error)}`, DockerExecutorAdapter.name);
        }
    }

    /**
     * Runs a call against the Docker daemon, counting it on the telemetry event of the current unit of work.
     *
     * @param operation Docker call to run
     *
     * @returns Whatever the operation resolves to
     */
    private async run<T>(operation: () => Promise<T>): Promise<T> {
        const startedAt = performance.now();

        try {
            const result = await operation();

            recordDependencyCall('docker', performance.now() - startedAt, false);

            return result;
        } catch (error) {
            recordDependencyCall('docker', performance.now() - startedAt, true);

            throw error;
        }
    }
}
