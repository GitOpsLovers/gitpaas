import type { Deployment } from '@gitpaas/contracts';

/**
 * Measures the run of a successful deployment, from the start of its run to its end.
 *
 * @param deployment Deployment of the service
 *
 * @returns The duration of the run in milliseconds, or `null` when the deployment cannot be a reference
 */
function runDuration(deployment: Deployment): number | null {
    if (deployment.status !== 'success' || !deployment.startedAt || !deployment.finishedAt) {
        return null;
    }

    const elapsedMs = new Date(deployment.finishedAt).getTime() - new Date(deployment.startedAt).getTime();

    return Number.isNaN(elapsedMs) || elapsedMs < 0 ? null : elapsedMs;
}

/**
 * Compares the run of each successful deployment with the run of the nearest older successful deployment.
 *
 * @param deployments Deployments of one service, in any order
 *
 * @returns The rounded change in percent for each identifier of a deployment: positive when the run is faster,
 * negative when it is slower
 */
export function compareDeploymentDurationsUseCase(deployments: Deployment[]): Map<string, number> {
    const changes = new Map<string, number>();
    const oldestFirst = [...deployments].sort(
        (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
    );
    let previous: number | null = null;

    oldestFirst.forEach((deployment) => {
        const current = runDuration(deployment);

        if (current === null) {
            return;
        }

        if (previous !== null && previous > 0) {
            const change = Math.round(((previous - current) / previous) * 100);

            if (change !== 0) {
                changes.set(deployment.id, change);
            }
        }

        previous = current;
    });

    return changes;
}
