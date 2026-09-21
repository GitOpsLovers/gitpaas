import type { Deployment, DeploymentStatus } from '@gitpaas/contracts';

import { compareDeploymentDurationsUseCase } from './compare-deployment-durations.use-case';

/**
 * Builds a deployment created at the given minute, whose run lasts the given number of seconds.
 *
 * @param id Identifier of the deployment
 * @param minute Minute of the creation, so a higher minute is a newer deployment
 * @param seconds Duration of the run, or `null` for a deployment with no `startedAt`
 * @param status Status of the deployment
 *
 * @returns The deployment
 */
function deployment(id: string, minute: number, seconds: number | null, status: DeploymentStatus = 'success'): Deployment {
    const createdAt = new Date(Date.UTC(2026, 0, 1, 10, minute));
    const startedAt = new Date(createdAt.getTime() + 5000);

    return {
        id,
        serviceId: 'sv-1',
        status,
        branch: 'main',
        commit: null,
        commitMessage: null,
        composerPath: 'docker-compose.yml',
        triggeredBy: 'us-1',
        error: null,
        createdAt: createdAt.toISOString(),
        startedAt: seconds === null ? null : startedAt.toISOString(),
        finishedAt: new Date(startedAt.getTime() + (seconds ?? 0) * 1000).toISOString(),
    };
}

describe('compareDeploymentDurationsUseCase', () => {
    test('gives a positive change when the run is faster than the previous successful run', () => {
        const changes = compareDeploymentDurationsUseCase([deployment('dp-2', 2, 75), deployment('dp-1', 1, 100)]);

        expect(changes).toEqual(new Map([['dp-2', 25]]));
    });

    test('gives a negative change when the run is slower than the previous successful run', () => {
        const changes = compareDeploymentDurationsUseCase([deployment('dp-2', 2, 150), deployment('dp-1', 1, 100)]);

        expect(changes).toEqual(new Map([['dp-2', -50]]));
    });

    test('rounds the change to a whole percent', () => {
        const changes = compareDeploymentDurationsUseCase([deployment('dp-2', 2, 2), deployment('dp-1', 1, 3)]);

        expect(changes).toEqual(new Map([['dp-2', 33]]));
    });

    test('compares each entry with the nearest older successful entry', () => {
        const changes = compareDeploymentDurationsUseCase([
            deployment('dp-3', 3, 60),
            deployment('dp-2', 2, 80),
            deployment('dp-1', 1, 100),
        ]);

        expect(changes).toEqual(new Map([['dp-3', 25], ['dp-2', 20]]));
    });

    test('reads the order from the creation date, and not from the order of the list', () => {
        const changes = compareDeploymentDurationsUseCase([deployment('dp-1', 1, 100), deployment('dp-2', 2, 75)]);

        expect(changes).toEqual(new Map([['dp-2', 25]]));
    });

    test('gives no change to an entry that is not successful', () => {
        const statuses: DeploymentStatus[] = ['failed', 'pending', 'running'];

        statuses.forEach((status) => {
            const changes = compareDeploymentDurationsUseCase([deployment('dp-2', 2, 50, status), deployment('dp-1', 1, 100)]);

            expect(changes).toEqual(new Map());
        });
    });

    test('never takes an entry that is not successful as the reference', () => {
        const changes = compareDeploymentDurationsUseCase([
            deployment('dp-3', 3, 75),
            deployment('dp-2', 2, 10, 'failed'),
            deployment('dp-1', 1, 100),
        ]);

        expect(changes).toEqual(new Map([['dp-3', 25]]));
    });

    test('gives no change to an entry with no start of its run', () => {
        const changes = compareDeploymentDurationsUseCase([deployment('dp-2', 2, null), deployment('dp-1', 1, 100)]);

        expect(changes).toEqual(new Map());
    });

    test('skips an older successful entry with no start of its run as the reference', () => {
        const changes = compareDeploymentDurationsUseCase([
            deployment('dp-3', 3, 75),
            deployment('dp-2', 2, null),
            deployment('dp-1', 1, 100),
        ]);

        expect(changes).toEqual(new Map([['dp-3', 25]]));
    });

    test('gives no change when no older successful entry with a start of its run exists', () => {
        expect(compareDeploymentDurationsUseCase([deployment('dp-1', 1, 100)])).toEqual(new Map());
        expect(compareDeploymentDurationsUseCase([deployment('dp-2', 2, 75), deployment('dp-1', 1, null)])).toEqual(new Map());
    });

    test('gives no change when the previous run lasted 0 s', () => {
        const changes = compareDeploymentDurationsUseCase([deployment('dp-2', 2, 10), deployment('dp-1', 1, 0)]);

        expect(changes).toEqual(new Map());
    });

    test('gives no change when the rounded change is 0%', () => {
        const same = compareDeploymentDurationsUseCase([deployment('dp-2', 2, 100), deployment('dp-1', 1, 100)]);
        const faster = compareDeploymentDurationsUseCase([deployment('dp-2', 2, 999), deployment('dp-1', 1, 1000)]);
        const slower = compareDeploymentDurationsUseCase([deployment('dp-2', 2, 1004), deployment('dp-1', 1, 1000)]);

        expect(same).toEqual(new Map());
        expect(faster).toEqual(new Map());
        expect(slower).toEqual(new Map());
    });

    test('gives no change for an empty list', () => {
        expect(compareDeploymentDurationsUseCase([])).toEqual(new Map());
    });
});
