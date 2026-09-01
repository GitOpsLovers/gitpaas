import { RuntimeLogFollower } from '../domain/ports/runtime-log-follower.port';

import type { ContainerRuntime } from '@core/domain/ports/container-runtime.port';
import { getGitpaasLabels } from '@shared/application/get-gitpaas-labels.use-case';

/**
 * Use case for holding one stream of the output open for each container of GitPaaS that runs
 *
 * @param client Container runtime the containers are read from
 * @param follower Follower of the output of the containers that run
 *
 * @returns Number of containers that run
 */
export async function followRunningContainersUseCase(
    client: ContainerRuntime,
    follower: RuntimeLogFollower,
): Promise<number> {
    const containers = await client.listContainers({ labels: getGitpaasLabels() }, false);
    const running = new Set(containers.map((container) => container.id));

    for (const containerId of follower.followed()) {
        if (!running.has(containerId)) {
            follower.unfollow(containerId);
        }
    }

    const followed = new Set(follower.followed());

    for (const containerId of running) {
        if (!followed.has(containerId)) {
            follower.follow(containerId);
        }
    }

    return running.size;
}
