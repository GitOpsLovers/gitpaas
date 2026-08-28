import type { DependencyState } from '@gitpaas/contracts';

import { HealthProbe } from '../../domain/ports/health-probe.port';
import { checkReadinessUseCase } from '../check-readiness.use-case';

/**
 * Builds a health probe stub whose `check()` resolves to the given state.
 */
const stateProbe = (name: string, state: DependencyState): jest.Mocked<HealthProbe> => {
    return { name, check: jest.fn().mockResolvedValue(state) };
};

/**
 * Builds a health probe stub whose `check()` rejects with the given error.
 */
const throwingProbe = (name: string, error: unknown): jest.Mocked<HealthProbe> => {
    return { name, check: jest.fn().mockRejectedValue(error) };
};

describe('checkReadinessUseCase', () => {
    it('runs every probe exactly once', async () => {
        const postgres = stateProbe('postgres', 'up');
        const docker = stateProbe('docker', 'up');

        await checkReadinessUseCase([postgres, docker]);

        expect(postgres.check).toHaveBeenCalledTimes(1);
        expect(docker.check).toHaveBeenCalledTimes(1);
    });

    it('reports ok with every dependency up when every probe reports up', async () => {
        const result = await checkReadinessUseCase([
            stateProbe('postgres', 'up'),
            stateProbe('docker', 'up'),
        ]);

        expect(result).toEqual({
            status: 'ok',
            dependencies: [
                { name: 'postgres', status: 'up' },
                { name: 'docker', status: 'up' },
            ],
        });
    });

    it('reports error when a single probe reports down, marking only it down', async () => {
        const result = await checkReadinessUseCase([
            stateProbe('postgres', 'up'),
            stateProbe('docker', 'down'),
        ]);

        expect(result).toEqual({
            status: 'error',
            dependencies: [
                { name: 'postgres', status: 'up' },
                { name: 'docker', status: 'down' },
            ],
        });
    });

    it('reports error with every failing dependency marked down when several probes fail', async () => {
        const result = await checkReadinessUseCase([
            stateProbe('postgres', 'down'),
            stateProbe('docker', 'down'),
        ]);

        expect(result).toEqual({
            status: 'error',
            dependencies: [
                { name: 'postgres', status: 'down' },
                { name: 'docker', status: 'down' },
            ],
        });
    });

    it('reports a throwing probe as down without propagating the error', async () => {
        const result = await checkReadinessUseCase([
            stateProbe('postgres', 'up'),
            throwingProbe('docker', new Error('connection refused')),
        ]);

        expect(result).toEqual({
            status: 'error',
            dependencies: [
                { name: 'postgres', status: 'up' },
                { name: 'docker', status: 'down' },
            ],
        });
    });

    it('reports error when every probe throws, marking all down', async () => {
        const result = await checkReadinessUseCase([
            throwingProbe('postgres', new Error('down')),
            throwingProbe('docker', 'boom'),
        ]);

        expect(result).toEqual({
            status: 'error',
            dependencies: [
                { name: 'postgres', status: 'down' },
                { name: 'docker', status: 'down' },
            ],
        });
    });

    it('reports ok when a dependency the environment does not carry reports not-applicable', async () => {
        const result = await checkReadinessUseCase([
            stateProbe('postgres', 'up'),
            stateProbe('proxy', 'not-applicable'),
        ]);

        expect(result).toEqual({
            status: 'ok',
            dependencies: [
                { name: 'postgres', status: 'up' },
                { name: 'proxy', status: 'not-applicable' },
            ],
        });
    });

    it('reports ok when every dependency is not-applicable', async () => {
        const result = await checkReadinessUseCase([
            stateProbe('proxy', 'not-applicable'),
            stateProbe('backend', 'not-applicable'),
            stateProbe('frontend', 'not-applicable'),
        ]);

        expect(result.status).toBe('ok');
    });

    it('reports error when one dependency is down beside a not-applicable one', async () => {
        const result = await checkReadinessUseCase([
            stateProbe('postgres', 'down'),
            stateProbe('proxy', 'not-applicable'),
        ]);

        expect(result).toEqual({
            status: 'error',
            dependencies: [
                { name: 'postgres', status: 'down' },
                { name: 'proxy', status: 'not-applicable' },
            ],
        });
    });

    it('reports ok with the six services of the stack up', async () => {
        const result = await checkReadinessUseCase([
            stateProbe('postgres', 'up'),
            stateProbe('docker', 'up'),
            stateProbe('redis', 'up'),
            stateProbe('proxy', 'up'),
            stateProbe('backend', 'up'),
            stateProbe('frontend', 'up'),
        ]);

        expect(result).toEqual({
            status: 'ok',
            dependencies: [
                { name: 'postgres', status: 'up' },
                { name: 'docker', status: 'up' },
                { name: 'redis', status: 'up' },
                { name: 'proxy', status: 'up' },
                { name: 'backend', status: 'up' },
                { name: 'frontend', status: 'up' },
            ],
        });
    });

    it('reports ok outside of production, where the three containers of the stack are not applicable', async () => {
        const result = await checkReadinessUseCase([
            stateProbe('postgres', 'up'),
            stateProbe('docker', 'up'),
            stateProbe('redis', 'up'),
            stateProbe('proxy', 'not-applicable'),
            stateProbe('backend', 'not-applicable'),
            stateProbe('frontend', 'not-applicable'),
        ]);

        expect(result).toEqual({
            status: 'ok',
            dependencies: [
                { name: 'postgres', status: 'up' },
                { name: 'docker', status: 'up' },
                { name: 'redis', status: 'up' },
                { name: 'proxy', status: 'not-applicable' },
                { name: 'backend', status: 'not-applicable' },
                { name: 'frontend', status: 'not-applicable' },
            ],
        });
    });

    it('reports error when a single service of the stack is down, marking only it down', async () => {
        const result = await checkReadinessUseCase([
            stateProbe('postgres', 'up'),
            stateProbe('docker', 'up'),
            stateProbe('redis', 'down'),
            stateProbe('proxy', 'up'),
            stateProbe('backend', 'up'),
            stateProbe('frontend', 'up'),
        ]);

        expect(result).toEqual({
            status: 'error',
            dependencies: [
                { name: 'postgres', status: 'up' },
                { name: 'docker', status: 'up' },
                { name: 'redis', status: 'down' },
                { name: 'proxy', status: 'up' },
                { name: 'backend', status: 'up' },
                { name: 'frontend', status: 'up' },
            ],
        });
    });

    it('preserves probe ordering in the breakdown', async () => {
        const result = await checkReadinessUseCase([
            stateProbe('docker', 'up'),
            stateProbe('postgres', 'up'),
        ]);

        expect(result.dependencies.map((dependency) => dependency.name)).toEqual([
            'docker',
            'postgres',
        ]);
    });

    it('reports ok with an empty breakdown when there are no probes', async () => {
        const result = await checkReadinessUseCase([]);

        expect(result).toEqual({ status: 'ok', dependencies: [] });
    });
});
