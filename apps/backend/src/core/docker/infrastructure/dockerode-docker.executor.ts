import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { Injectable, Logger } from '@nestjs/common';
import Docker from 'dockerode';
import DockerodeCompose from 'dockerode-compose';

import { DockerExecutor, DockerLogListener } from '../domain/executors/docker.executor';

import { decodeDockerLogBuffer, toLogLines } from './docker-log.util';
import { DockerClient } from './docker.client';

/** Number of trailing startup log lines captured per container after it starts. */
const STARTUP_LOG_TAIL = 100;

@Injectable()

/**
 * Dockerode Docker executor
 */
export class DockerodeDockerExecutor implements DockerExecutor {
    private readonly logger = new Logger(DockerodeDockerExecutor.name);

    constructor(private readonly docker: DockerClient) {}

    /**
     * Runs `docker-compose up`, streaming progress and container output to `onLog`.
     *
     * @param composeContent Raw docker-compose YAML
     * @param projectName Compose project name used to group the stack's resources
     * @param onLog Optional listener receiving real-time output
     */
    public async up(composeContent: string, projectName: string, onLog?: DockerLogListener): Promise<void> {
        const emit = (line: string): void => onLog?.(line);
        const directory = await mkdtemp(join(tmpdir(), 'artifactory-deploy-'));
        const composeFile = join(directory, 'docker-compose.yml');

        try {
            // eslint-disable-next-line security/detect-non-literal-fs-filename
            await writeFile(composeFile, composeContent);

            const compose = new DockerodeCompose(this.docker.getClient(), composeFile, projectName);

            this.logger.log(`Pulling images for project "${projectName}"`);
            emit('▶ Pulling images…');

            await this.pullWithProgress(compose, emit);

            this.logger.log(`Bringing project "${projectName}" up`);
            emit('▶ Creating and starting containers…');

            const result = (await compose.up()) as { services?: Docker.Container[] };
            const containers = result.services ?? [];

            for (const container of containers) {
                // eslint-disable-next-line no-await-in-loop
                await this.captureStartupLogs(container, emit);
            }

            emit(`✔ Stack "${projectName}" is up (${containers.length} container(s))`);
        } finally {
            await rm(directory, { recursive: true, force: true });
        }
    }

    /**
     * Pulls the stack's images, forwarding the daemon's pull progress to `emit`.
     *
     * @param compose Dockerode-compose instance
     * @param emit Line emitter
     */
    private async pullWithProgress(compose: DockerodeCompose, emit: DockerLogListener): Promise<void> {
        // `streams: true` returns the raw pull streams without consuming them, so we
        // can follow their progress ourselves.
        const streams = (await compose.pull(undefined, { streams: true })) as NodeJS.ReadableStream[];

        await Promise.all(streams.map((stream) => this.followPull(stream, emit)));
    }

    /**
     * Follows a single image pull stream, emitting discrete status lines.
     *
     * @param stream Pull progress stream
     * @param emit Line emitter
     */
    private followPull(stream: NodeJS.ReadableStream, emit: DockerLogListener): Promise<void> {
        return new Promise((resolve, reject) => {
            this.docker.getClient().modem.followProgress(
                stream,
                (error) => (error ? reject(error) : resolve()),
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

            const raw = (await container.logs({
                follow: false,
                stdout: true,
                stderr: true,
                tail: STARTUP_LOG_TAIL,
                timestamps: false,
            })) as unknown as Buffer;

            const text = info.Config.Tty ? raw.toString('utf8') : decodeDockerLogBuffer(raw);
            const lines = toLogLines(text);

            emit(`── ${name} ──`);
            lines.forEach(emit);
        } catch (error) {
            // Startup logs are best-effort; a failure here must not fail the deploy.
            this.logger.warn(`Could not read startup logs for container ${container.id}: ${String(error)}`);
        }
    }
}
