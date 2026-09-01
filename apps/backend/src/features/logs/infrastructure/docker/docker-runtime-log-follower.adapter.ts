import type { RuntimeLogLine } from '@gitpaas/contracts';
import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';

import { RuntimeLogFollower } from '../../domain/ports/runtime-log-follower.port';
import type { RuntimeLogStore } from '../../domain/ports/runtime-log-store.port';
import { MemoryRuntimeLogStoreAdapter } from '../memory/memory-runtime-log-store.adapter';

import type { AppLogger } from '@core/domain/ports/app-logger.port';
import type { ContainerRuntime } from '@core/domain/ports/container-runtime.port';
import { DockerContainerRuntimeAdapter } from '@core/infrastructure/docker/docker-container-runtime.adapter';
import { NestLoggerAdapter } from '@core/infrastructure/logging/nest-logger.adapter';

/**
 * Follower that keeps one stream of the daemon open for each container that runs.
 */
@Injectable()
export class DockerRuntimeLogFollowerAdapter implements RuntimeLogFollower, OnModuleDestroy {
    /**
     * The open stream of each container the follower reads, keyed by the identifier of that container.
     */
    private readonly streams = new Map<string, AsyncIterator<RuntimeLogLine>>();

    constructor(
        @Inject(DockerContainerRuntimeAdapter)
        private readonly client: ContainerRuntime,
        @Inject(MemoryRuntimeLogStoreAdapter)
        private readonly store: RuntimeLogStore,
        @Inject(NestLoggerAdapter)
        private readonly logger: AppLogger,
    ) {}

    public followed(): string[] {
        return [...this.streams.keys()];
    }

    public follow(containerId: string): void {
        if (this.streams.has(containerId)) {
            return;
        }

        const stream = this.client.readContainerLogs(containerId, { follow: true, tail: 0 });
        const iterator = stream[Symbol.asyncIterator]();

        this.streams.set(containerId, iterator);

        this.consume(containerId, iterator).catch((error: unknown) => {
            const message = error instanceof Error ? error.message : String(error);

            this.logger.error(
                `Failed to read the output of the container ${containerId}: ${message}`,
                error,
                DockerRuntimeLogFollowerAdapter.name,
            );
        });
    }

    public unfollow(containerId: string): void {
        const iterator = this.streams.get(containerId);

        if (iterator === undefined) {
            return;
        }

        this.streams.delete(containerId);
        this.store.close(containerId);
        this.endStream(containerId, iterator);
    }

    /**
     * Closes every stream the follower holds, so a shutdown leaves no socket of the daemon open.
     */
    public onModuleDestroy(): void {
        for (const containerId of this.followed()) {
            this.unfollow(containerId);
        }
    }

    /**
     * Sends the lines of one stream to the store, until the container stops or the follow ends.
     *
     * @param containerId Identifier of the container
     * @param iterator Open stream of the output of that container
     */
    private async consume(containerId: string, iterator: AsyncIterator<RuntimeLogLine>): Promise<void> {
        try {
            let next = await iterator.next();

            while (next.done !== true) {
                if (this.streams.get(containerId) !== iterator) {
                    return;
                }

                this.store.append(containerId, next.value);
                next = await iterator.next();
            }
        } finally {
            if (this.streams.get(containerId) === iterator) {
                this.streams.delete(containerId);
                this.store.close(containerId);
            }
        }
    }

    /**
     * Asks a stream to end, and swallows the failure of that end into the log of the application.
     *
     * @param containerId Identifier of the container
     * @param iterator Stream to end
     */
    private endStream(containerId: string, iterator: AsyncIterator<RuntimeLogLine>): void {
        Promise.resolve(iterator.return?.()).catch((error: unknown) => {
            const message = error instanceof Error ? error.message : String(error);

            this.logger.warn(
                `Failed to close the stream of the output of the container ${containerId}: ${message}`,
                DockerRuntimeLogFollowerAdapter.name,
            );
        });
    }
}
