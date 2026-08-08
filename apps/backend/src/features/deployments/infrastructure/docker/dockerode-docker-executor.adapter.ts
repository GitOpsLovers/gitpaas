import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import { Inject, Injectable } from '@nestjs/common';
import Docker from 'dockerode';
import DockerodeCompose from 'dockerode-compose';
import * as tar from 'tar';

import { DockerExecutor, DockerLogListener } from '../../domain/ports/docker-executor.port';

import { decodeDockerLogBuffer, toLogLines } from './docker-log.util';

import type { AppLogger } from '@core/domain/ports/app-logger.port';
import { DockerContainerRuntimeAdapter } from '@core/infrastructure/docker/docker-container-runtime.adapter';
import { COMPOSE_PROJECT_LABEL, COMPOSE_SERVICE_LABEL } from '@core/infrastructure/docker/docker-container-runtime.transformer';
import { NestLoggerAdapter } from '@core/infrastructure/logging/nest-logger.adapter';
import { getGitpaasLabels } from '@shared/application/get-gitpaas-labels.use-case';

/** Number of trailing startup log lines captured per container after it starts. */
const STARTUP_LOG_TAIL = 100;

/** A service's `build` block, in either the shorthand (string) or long (object) form. */
type ComposeBuild = string | { context?: string; dockerfile?: string; args?: string[] | Record<string, unknown>; target?: string };

/** A service's `healthcheck` block (only the duration fields we normalize). */
interface ComposeHealthcheck {
    interval?: string | number;
    timeout?: string | number;
    start_period?: string | number;
}

/** A compose `labels` block, in either the list (`KEY=value`) or map form. */
type ComposeLabels = string[] | Record<string, unknown>;

/** The subset of a compose service the executor reads/rewrites. */
interface ComposeService {
    image?: string;
    build?: ComposeBuild;
    healthcheck?: ComposeHealthcheck;
    labels?: ComposeLabels;
}

/** The subset of a top-level compose volume/network the executor rewrites. */
interface ComposeResource {
    labels?: ComposeLabels;
}

/** The parsed compose recipe exposed by `dockerode-compose`. */
interface ComposeRecipe {
    services?: Record<string, ComposeService>;
    volumes?: Record<string, ComposeResource | null>;
    networks?: Record<string, ComposeResource | null>;
}

/** A resolved build definition ready to hand to `docker.buildImage`. */
interface ResolvedBuild {
    contextPath: string;
    dockerfile: string;
    buildargs?: Record<string, string>;
    target?: string;
}

/**
 * Dockerode Docker executor
 */
@Injectable()
export class DockerodeDockerExecutorAdapter implements DockerExecutor {
    constructor(
        @Inject(DockerContainerRuntimeAdapter)
        private readonly docker: DockerContainerRuntimeAdapter,
        @Inject(NestLoggerAdapter)
        private readonly logger: AppLogger,
    ) {}

    public async up(archive: Buffer, composePath: string, projectName: string, onLog?: DockerLogListener): Promise<void> {
        const emit = (line: string): void => onLog?.(line);
        const directory = await mkdtemp(join(tmpdir(), 'gitpaas-deploy-'));

        try {
            emit('▶ Extracting repository…');
            await this.extractArchive(archive, directory);

            const composeFile = join(directory, composePath);
            const compose = new DockerodeCompose(this.docker.getClient(), composeFile, projectName);

            // Build local `build:` services first (streaming their output), which
            // rewrites them into plain image services in the recipe.
            const builtImages = await this.buildServices(compose, composeFile, projectName, emit);

            this.logger.log(`Pulling images for project "${projectName}"`, DockerodeDockerExecutorAdapter.name);
            emit('▶ Pulling images…');

            await this.pullWithProgress(compose, emit, builtImages);

            emit('▶ Removing previous containers…');
            await compose.down();

            // dockerode-compose crashes on a healthcheck with a missing duration and
            // mis-parses second-based durations; pre-normalize them to numeric
            // nanoseconds, which it forwards to the daemon untouched.
            this.normalizeHealthchecks(compose);

            // Stamp the GitPaaS ownership marker on every resource the stack creates,
            // so later maintenance operations can be scoped to what GitPaaS owns.
            this.stampLabels(compose, projectName);

            this.logger.log(`Bringing project "${projectName}" up`, DockerodeDockerExecutorAdapter.name);
            emit('▶ Creating and starting containers…');

            const result = (await compose.up()) as { services?: Docker.Container[] };
            const containers = result.services ?? [];

            for (const container of containers) {
                await this.captureStartupLogs(container, emit);
            }

            emit(`✔ Stack "${projectName}" is up (${containers.length} container(s))`);
        } finally {
            await rm(directory, { recursive: true, force: true });
        }
    }

    /**
     * Extracts a gzipped repository tarball into a directory, stripping the single
     * top-level `owner-repo-<sha>/` folder GitHub wraps everything in.
     *
     * @param archive Gzipped tarball bytes
     * @param directory Destination directory
     */
    private async extractArchive(archive: Buffer, directory: string): Promise<void> {
        await pipeline(Readable.from(archive), tar.x({ cwd: directory, strip: 1 }));
    }

    /**
     * Builds every service that declares a local `build:` context, streaming the
     * Docker build output, and rewrites each into a plain image service so
     * `compose.up()` runs (rather than rebuilds) it.
     *
     * @param compose Dockerode-compose instance
     * @param composeFile Absolute path to the compose file (build contexts are relative to its dir)
     * @param projectName Compose project name, used to tag built images
     * @param emit Line emitter
     *
     * @returns The set of image tags that were built locally (never pulled from a registry)
     */
    private async buildServices(
        compose: DockerodeCompose,
        composeFile: string,
        projectName: string,
        emit: DockerLogListener,
    ): Promise<Set<string>> {
        const services = this.recipeServices(compose);
        const baseDir = dirname(composeFile);
        const built = new Set<string>();

        for (const [name, service] of Object.entries(services)) {
            if (service.build == null) {
                continue;
            }

            const tag = `${projectName}_${name}`;
            const build = this.resolveBuild(service.build, baseDir);

            this.logger.log(`Building service "${name}" as "${tag}"`, DockerodeDockerExecutorAdapter.name);
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
     * Resolves a compose `build` block into an absolute context path, dockerfile and
     * build args relative to the compose file's directory.
     *
     * @param build Compose build block (string shorthand or object form)
     * @param baseDir Directory containing the compose file
     */
    private resolveBuild(build: ComposeBuild, baseDir: string): ResolvedBuild {
        if (typeof build === 'string') {
            return { contextPath: resolve(baseDir, build), dockerfile: 'Dockerfile' };
        }

        return {
            contextPath: resolve(baseDir, build.context ?? '.'),
            dockerfile: build.dockerfile ?? 'Dockerfile',
            buildargs: this.normalizeBuildArgs(build.args),
            target: build.target,
        };
    }

    /**
     * Normalises compose build args (list `KEY=value` or map form) into the
     * `{ key: value }` object the Docker API expects.
     *
     * @param args Compose build args
     */
    private normalizeBuildArgs(args?: string[] | Record<string, unknown>): Record<string, string> | undefined {
        if (!args) {
            return undefined;
        }

        if (Array.isArray(args)) {
            return Object.fromEntries(args.map((entry) => {
                const separator = entry.indexOf('=');

                return separator === -1
                    ? [entry, '']
                    : [entry.slice(0, separator), entry.slice(separator + 1)];
            }));
        }

        return Object.fromEntries(Object.entries(args).map(([key, value]) => [key, String(value)]));
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

        const stream = await this.docker.getClient().buildImage(context, {
            t: tag,
            dockerfile: build.dockerfile,
            buildargs: build.buildargs,
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
        return new Promise((resolvePromise, reject) => {
            this.docker.getClient().modem.followProgress(
                stream,
                (error) => {
                    if (error) {
                        reject(error instanceof Error ? error : new Error(String(error)));
                    } else {
                        resolvePromise();
                    }
                },
                (event: { stream?: string; status?: string }) => {
                    const text = event.stream ?? event.status;

                    if (text) {
                        toLogLines(text).forEach(emit);
                    }
                },
            );
        });
    }

    /**
     * Pulls the stack's registry images, forwarding the daemon's pull progress to `emit`.
     *
     * Skips locally-built images (they exist on the daemon, not in a registry) and
     * services without an `image`.
     *
     * @param compose Dockerode-compose instance
     * @param emit Line emitter
     * @param builtImages Image tags built locally, which must not be pulled
     */
    private async pullWithProgress(compose: DockerodeCompose, emit: DockerLogListener, builtImages: Set<string>): Promise<void> {
        const services = this.recipeServices(compose);

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

            const stream = await this.docker.getClient().pull(image);

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
        return new Promise((resolvePromise, reject) => {
            this.docker.getClient().modem.followProgress(
                stream,
                (error) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolvePromise();
                    }
                },
                (event: { status?: string; id?: string; progress?: string }) => {
                    // Skip byte-level progress frames; keep discrete lifecycle lines.
                    if (!event.status || event.progress) {
                        return;
                    }

                    emit(event.id ? `${event.id}: ${event.status}` : event.status);
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
    private async captureStartupLogs(container: Docker.Container, emit: DockerLogListener): Promise<void> {
        try {
            const info = await container.inspect();
            const name = info.Name.replace(/^\//, '') || container.id.slice(0, 12);

            const raw = await container.logs({
                follow: false,
                stdout: true,
                stderr: true,
                tail: STARTUP_LOG_TAIL,
                timestamps: false,
            });

            const text = info.Config.Tty ? raw.toString('utf8') : decodeDockerLogBuffer(raw);
            const lines = toLogLines(text);

            emit(`── ${name} ──`);
            lines.forEach(emit);
        } catch (error) {
            // Startup logs are best-effort; a failure here must not fail the deploy.
            this.logger.warn(`Could not read startup logs for container ${container.id}: ${String(error)}`, DockerodeDockerExecutorAdapter.name);
        }
    }

    /**
     * Rewrites every service's healthcheck durations into numeric nanoseconds.
     *
     * `dockerode-compose` throws on a healthcheck whose `interval`, `timeout` or
     * `start_period` is omitted (it calls `.includes()` on `undefined`) and
     * mis-parses second-based strings like `5s` into `NaN`. Numeric values are
     * passed straight through to the daemon, so converting here fixes both.
     *
     * @param compose Dockerode-compose instance
     */
    private normalizeHealthchecks(compose: DockerodeCompose): void {
        for (const service of Object.values(this.recipeServices(compose))) {
            const healthcheck = service.healthcheck;

            if (!healthcheck) {
                continue;
            }

            healthcheck.interval = this.toNanoseconds(healthcheck.interval);
            healthcheck.timeout = this.toNanoseconds(healthcheck.timeout);
            healthcheck.start_period = this.toNanoseconds(healthcheck.start_period);
        }
    }

    /**
     * Stamps the GitPaaS ownership labels on every resource the stack will create:
     * each service's containers plus the top-level volumes and networks.
     *
     * `dockerode-compose` **overwrites** a container's labels with the service's
     * own `labels` block whenever one is declared, discarding the compose
     * project/service labels it had set — and it only understands the list form
     * (`KEY=value`). Both the GitPaaS labels and the compose labels are therefore
     * merged into a normalised list form here, preserving user-declared labels.
     * Volumes and networks are safe to merge as a map, since the library spreads
     * their `labels` object.
     *
     * @param compose Dockerode-compose instance
     * @param projectName Compose project name the stack is grouped under
     */
    private stampLabels(compose: DockerodeCompose, projectName: string): void {
        const gitpaas = getGitpaasLabels(projectName);

        for (const [name, service] of Object.entries(this.recipeServices(compose))) {
            service.labels = this.toLabelList({
                ...this.toLabelMap(service.labels),
                ...gitpaas,
                [COMPOSE_PROJECT_LABEL]: projectName,
                [COMPOSE_SERVICE_LABEL]: name,
            });
        }

        for (const resource of this.recipeResources(compose)) {
            resource.labels = { ...this.toLabelMap(resource.labels), ...gitpaas };
        }
    }

    /**
     * Normalises a compose `labels` block (list or map form) into a label map.
     *
     * @param labels Compose labels block, if any
     *
     * @returns Labels as a `{ key: value }` map
     */
    private toLabelMap(labels?: ComposeLabels): Record<string, string> {
        if (!labels) {
            return {};
        }

        if (Array.isArray(labels)) {
            return Object.fromEntries(labels.map((entry) => {
                const separator = entry.indexOf('=');

                return separator === -1
                    ? [entry, '']
                    : [entry.slice(0, separator), entry.slice(separator + 1)];
            }));
        }

        return Object.fromEntries(Object.entries(labels).map(([key, value]) => [key, String(value)]));
    }

    /**
     * Renders a label map as the `KEY=value` list form `dockerode-compose` parses.
     *
     * @param labels Label map
     *
     * @returns Labels as a `KEY=value` list
     */
    private toLabelList(labels: Record<string, string>): string[] {
        return Object.entries(labels).map(([key, value]) => `${key}=${value}`);
    }

    /**
     * Returns every top-level volume and network declared by a compose recipe,
     * materialising the `null` shorthand (`volumes: { data: }`) into an object.
     *
     * @param compose Dockerode-compose instance
     *
     * @returns Declared volume and network definitions
     */
    private recipeResources(compose: DockerodeCompose): ComposeResource[] {
        const recipe = (compose as unknown as { recipe?: ComposeRecipe }).recipe;
        const resources: ComposeResource[] = [];

        for (const collection of [recipe?.volumes, recipe?.networks]) {
            if (!collection) {
                continue;
            }

            for (const [key, resource] of Object.entries(collection)) {
                const defined = resource ?? {};

                // eslint-disable-next-line security/detect-object-injection
                collection[key] = defined;
                resources.push(defined);
            }
        }

        return resources;
    }

    /**
     * Parses a Compose duration (e.g. `1m30s`, `5s`, `500ms`) into nanoseconds.
     *
     * @param value Compose duration string, a raw number (assumed nanoseconds), or undefined
     *
     * @returns Duration in nanoseconds, or `0` when absent or unparseable
     */
    private toNanoseconds(value: string | number | undefined): number {
        if (typeof value === 'number') {
            return value;
        }

        if (typeof value !== 'string') {
            return 0;
        }

        const units: Record<string, number> = {
            ns: 1, us: 1e3, ms: 1e6, s: 1e9, m: 60e9, h: 3600e9,
        };
        // eslint-disable-next-line security/detect-unsafe-regex
        const pattern = /(\d+(?:\.\d+)?)(ns|us|ms|s|m|h)/g;
        let total = 0;
        let matched = false;

        for (let match = pattern.exec(value); match !== null; match = pattern.exec(value)) {
            matched = true;
            total += Number.parseFloat(match[1]) * units[match[2]];
        }

        return matched ? total : 0;
    }

    /**
     * Returns the parsed services of a compose recipe.
     *
     * @param compose Dockerode-compose instance
     */
    private recipeServices(compose: DockerodeCompose): Record<string, ComposeService> {
        const recipe = (compose as unknown as { recipe?: ComposeRecipe }).recipe;

        return recipe?.services ?? {};
    }
}
