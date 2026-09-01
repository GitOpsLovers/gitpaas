import type { RuntimeLogLine } from '@gitpaas/contracts';
import { EMPTY, Observable } from 'rxjs';

import { RuntimeLogFollower } from '../domain/ports/runtime-log-follower.port';
import { RuntimeLogStore } from '../domain/ports/runtime-log-store.port';

import type { ContainerRuntime } from '@core/domain/ports/container-runtime.port';
import { getGitpaasLabels } from '@shared/application/get-gitpaas-labels.use-case';

/**
 * Use case for giving the live output of one container, and for following that container at once
 *
 * @param client Container runtime the containers are read from
 * @param follower Follower of the output of the containers that run
 * @param store Store the followed lines reach
 * @param containerId Identifier of the container the output comes from
 *
 * @returns Stream of the lines that container writes from now on
 */
export async function streamRuntimeLogsUseCase(
    client: ContainerRuntime,
    follower: RuntimeLogFollower,
    store: RuntimeLogStore,
    containerId: string,
): Promise<Observable<RuntimeLogLine>> {
    const containers = await client.listContainers({ labels: getGitpaasLabels() }, false);

    if (!containers.some((container) => container.id === containerId)) {
        return EMPTY;
    }

    follower.follow(containerId);

    return store.stream(containerId);
}
