import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { followRunningContainersUseCase } from '../../application/follow-running-containers.use-case';
import type { RuntimeLogFollower } from '../../domain/ports/runtime-log-follower.port';
import { DockerRuntimeLogFollowerAdapter } from '../../infrastructure/docker/docker-runtime-log-follower.adapter';

import type { AppLogger } from '@core/domain/ports/app-logger.port';
import type { ContainerRuntime } from '@core/domain/ports/container-runtime.port';
import { DockerContainerRuntimeAdapter } from '@core/infrastructure/docker/docker-container-runtime.adapter';
import { NestLoggerAdapter } from '@core/infrastructure/logging/nest-logger.adapter';

/**
 * Runtime log follow job
 */
@Injectable()
export class FollowRunningContainersJob {
    constructor(
        @Inject(DockerContainerRuntimeAdapter)
        private readonly client: ContainerRuntime,
        @Inject(DockerRuntimeLogFollowerAdapter)
        private readonly follower: RuntimeLogFollower,
        @Inject(NestLoggerAdapter) private readonly logger: AppLogger,
    ) {}

    /**
     * Opens one stream of the output for each container that runs, and closes the stream of a container that stopped.
     */
    @Cron(CronExpression.EVERY_30_SECONDS)
    public async followRunningContainers(): Promise<void> {
        try {
            await followRunningContainersUseCase(this.client, this.follower);
        } catch (error) {
            this.logger.error(
                'Failed to follow the output of the containers that run',
                error,
                FollowRunningContainersJob.name,
            );
        }
    }
}
