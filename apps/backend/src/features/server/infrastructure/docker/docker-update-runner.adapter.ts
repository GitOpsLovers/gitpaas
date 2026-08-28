import { Inject, Injectable } from '@nestjs/common';

import {
    DOCKER_SOCKET_PATH,
    GITPAAS_INSTALL_DIR,
    GITPAAS_REPOSITORY_SLUG,
    UPDATE_CONTAINER_IMAGE,
    UPDATE_SCRIPT_PATH,
} from '../../domain/constants/platform-update.constants';
import type { UpdateRunner } from '../../domain/ports/update-runner.port';

import type { AppLogger } from '@core/domain/ports/app-logger.port';
import type { ContainerRuntime } from '@core/domain/ports/container-runtime.port';
import { DockerContainerRuntimeAdapter } from '@core/infrastructure/docker/docker-container-runtime.adapter';
import { NestLoggerAdapter } from '@core/infrastructure/logging/nest-logger.adapter';
import { getGitpaasLabels } from '@shared/application/get-gitpaas-labels.use-case';

/**
 * The script the container of the update runs.
 */
const UPDATE_ENTRYPOINT = [
    'set -e',
    'command -v curl >/dev/null 2>&1 || apk add --no-cache curl',
    `if [ ! -f "${UPDATE_SCRIPT_PATH}" ]; then`,
    `  mkdir -p "${GITPAAS_INSTALL_DIR}/scripts"`,
    `  curl -fsSL "https://raw.githubusercontent.com/${GITPAAS_REPOSITORY_SLUG}/$2/scripts/update.sh" -o "${UPDATE_SCRIPT_PATH}"`,
    'fi',
    `exec sh "${UPDATE_SCRIPT_PATH}" --update-id "$1" --version "$2"`,
].join('\n');

/**
 * Docker update runner adapter
 */
@Injectable()
export class DockerUpdateRunnerAdapter implements UpdateRunner {
    constructor(
        @Inject(DockerContainerRuntimeAdapter)
        private readonly client: ContainerRuntime,
        @Inject(NestLoggerAdapter) private readonly logger: AppLogger,
    ) {}

    public async start(updateId: string, targetVersion: string): Promise<void> {
        await this.pull(UPDATE_CONTAINER_IMAGE);

        const containerId = await this.client.runDetachedContainer({
            image: UPDATE_CONTAINER_IMAGE,
            command: ['sh', '-c', UPDATE_ENTRYPOINT, 'sh', updateId, targetVersion],
            binds: [
                `${GITPAAS_INSTALL_DIR}:${GITPAAS_INSTALL_DIR}`,
                `${DOCKER_SOCKET_PATH}:${DOCKER_SOCKET_PATH}`,
            ],
            labels: getGitpaasLabels(),
        });

        this.logger.log(
            `The update to ${targetVersion} runs in the container ${containerId}`,
            DockerUpdateRunnerAdapter.name,
        );
    }

    /**
     * Pulls the image of the container of the update, and waits for the end of the pull.
     *
     * @param reference Image reference to pull
     */
    private async pull(reference: string): Promise<void> {
        const stream = await this.client.pullImage(reference);

        await new Promise<void>((resolvePromise, reject) => {
            this.client.followProgress(
                stream,
                (error) => {
                    if (error) {
                        reject(error instanceof Error ? error : new Error(JSON.stringify(error)));

                        return;
                    }

                    resolvePromise();
                },
                () => {
                    // The progress of the pull interests no one: the update reports its own.
                },
            );
        });
    }
}
