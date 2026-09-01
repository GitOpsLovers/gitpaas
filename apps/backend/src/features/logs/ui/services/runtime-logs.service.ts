import type { RuntimeLogLine } from '@gitpaas/contracts';
import { Inject, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';

import { streamRuntimeLogsUseCase } from '../../application/stream-runtime-logs.use-case';
import { RuntimeLogReadOptions } from '../../domain/models/runtime-log.models';
import type { RuntimeLogFollower } from '../../domain/ports/runtime-log-follower.port';
import type { RuntimeLogStore } from '../../domain/ports/runtime-log-store.port';
import { DockerRuntimeLogFollowerAdapter } from '../../infrastructure/docker/docker-runtime-log-follower.adapter';
import { MemoryRuntimeLogStoreAdapter } from '../../infrastructure/memory/memory-runtime-log-store.adapter';

import type { ContainerRuntime } from '@core/domain/ports/container-runtime.port';
import { DockerContainerRuntimeAdapter } from '@core/infrastructure/docker/docker-container-runtime.adapter';
import { enrichTelemetry } from '@core/infrastructure/telemetry/telemetry.context';

/**
 * Runtime logs service
 */
@Injectable()
export class RuntimeLogsService {
    constructor(
        @Inject(DockerContainerRuntimeAdapter)
        private readonly client: ContainerRuntime,
        @Inject(DockerRuntimeLogFollowerAdapter)
        private readonly follower: RuntimeLogFollower,
        @Inject(MemoryRuntimeLogStoreAdapter)
        private readonly store: RuntimeLogStore,
    ) {}

    /**
     * Get the output one container already wrote, oldest first.
     *
     * @param containerId Identifier of the container
     * @param options How many lines the read takes, and the instant it starts at
     *
     * @returns Ordered lines of the output of that container
     */
    public async getByContainer(containerId: string, options: RuntimeLogReadOptions): Promise<RuntimeLogLine[]> {
        const lines = await this.store.read(containerId, options);

        enrichTelemetry({ 'container.log_lines': lines.length });

        return lines;
    }

    /**
     * Stream the output one container writes from now on.
     *
     * @param containerId Identifier of the container
     *
     * @returns Stream of the lines of the output of that container
     */
    public streamByContainer(containerId: string): Promise<Observable<RuntimeLogLine>> {
        return streamRuntimeLogsUseCase(this.client, this.follower, this.store, containerId);
    }
}
