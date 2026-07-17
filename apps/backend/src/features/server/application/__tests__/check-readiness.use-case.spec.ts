import { HealthProbe } from '../../domain/repositories/health-probe.repository';
import { checkReadinessUseCase } from '../check-readiness.use-case';

/**
 * Builds a health probe stub whose `check()` resolves to the given value.
 */
function upProbe(name: string, up: boolean): jest.Mocked<HealthProbe> {
    return { name, check: jest.fn().mockResolvedValue(up) };
}

/**
 * Builds a health probe stub whose `check()` rejects with the given error.
 */
function throwingProbe(name: string, error: unknown): jest.Mocked<HealthProbe> {
    return { name, check: jest.fn().mockRejectedValue(error) };
}

describe('checkReadinessUseCase', () => {
    it('runs every probe exactly once', async () => {
        const postgres = upProbe('postgres', true);
        const redis = upProbe('redis', true);

        await checkReadinessUseCase([postgres, redis]);

        expect(postgres.check).toHaveBeenCalledTimes(1);
        expect(redis.check).toHaveBeenCalledTimes(1);
    });

    it('reports ok with every dependency up when all probes resolve true', async () => {
        const result = await checkReadinessUseCase([
            upProbe('postgres', true),
            upProbe('redis', true),
            upProbe('docker', true),
        ]);

        expect(result).toEqual({
            status: 'ok',
            dependencies: [
                { name: 'postgres', status: 'up' },
                { name: 'redis', status: 'up' },
                { name: 'docker', status: 'up' },
            ],
        });
    });

    it('reports error when a single probe resolves false, marking only it down', async () => {
        const result = await checkReadinessUseCase([
            upProbe('postgres', true),
            upProbe('redis', false),
            upProbe('docker', true),
        ]);

        expect(result).toEqual({
            status: 'error',
            dependencies: [
                { name: 'postgres', status: 'up' },
                { name: 'redis', status: 'down' },
                { name: 'docker', status: 'up' },
            ],
        });
    });

    it('reports error with every failing dependency marked down when several probes fail', async () => {
        const result = await checkReadinessUseCase([
            upProbe('postgres', false),
            upProbe('redis', true),
            upProbe('docker', false),
        ]);

        expect(result).toEqual({
            status: 'error',
            dependencies: [
                { name: 'postgres', status: 'down' },
                { name: 'redis', status: 'up' },
                { name: 'docker', status: 'down' },
            ],
        });
    });

    it('reports a throwing probe as down without propagating the error', async () => {
        const result = await checkReadinessUseCase([
            upProbe('postgres', true),
            throwingProbe('redis', new Error('connection refused')),
        ]);

        expect(result).toEqual({
            status: 'error',
            dependencies: [
                { name: 'postgres', status: 'up' },
                { name: 'redis', status: 'down' },
            ],
        });
    });

    it('reports error when every probe throws, marking all down', async () => {
        const result = await checkReadinessUseCase([
            throwingProbe('postgres', new Error('down')),
            throwingProbe('redis', 'boom'),
        ]);

        expect(result).toEqual({
            status: 'error',
            dependencies: [
                { name: 'postgres', status: 'down' },
                { name: 'redis', status: 'down' },
            ],
        });
    });

    it('preserves probe ordering in the breakdown', async () => {
        const result = await checkReadinessUseCase([
            upProbe('docker', true),
            upProbe('postgres', true),
            upProbe('redis', true),
        ]);

        expect(result.dependencies.map((dependency) => dependency.name)).toEqual([
            'docker',
            'postgres',
            'redis',
        ]);
    });

    it('reports ok with an empty breakdown when there are no probes', async () => {
        const result = await checkReadinessUseCase([]);

        expect(result).toEqual({ status: 'ok', dependencies: [] });
    });
});
