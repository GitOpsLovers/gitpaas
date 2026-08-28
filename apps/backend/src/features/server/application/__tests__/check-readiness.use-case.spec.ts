import { HealthProbe } from '../../domain/ports/health-probe.port';
import { checkReadinessUseCase } from '../check-readiness.use-case';

/**
 * Builds a health probe stub whose `check()` resolves to the given value.
 */
const upProbe = (name: string, up: boolean): jest.Mocked<HealthProbe> => {
    return { name, check: jest.fn().mockResolvedValue(up) };
};

/**
 * Builds a health probe stub whose `check()` rejects with the given error.
 */
const throwingProbe = (name: string, error: unknown): jest.Mocked<HealthProbe> => {
    return { name, check: jest.fn().mockRejectedValue(error) };
};

describe('checkReadinessUseCase', () => {
    it('runs every probe exactly once', async () => {
        const postgres = upProbe('postgres', true);
        const docker = upProbe('docker', true);

        await checkReadinessUseCase([postgres, docker]);

        expect(postgres.check).toHaveBeenCalledTimes(1);
        expect(docker.check).toHaveBeenCalledTimes(1);
    });

    it('reports ok with every dependency up when all probes resolve true', async () => {
        const result = await checkReadinessUseCase([
            upProbe('postgres', true),
            upProbe('docker', true),
        ]);

        expect(result).toEqual({
            status: 'ok',
            dependencies: [
                { name: 'postgres', status: 'up' },
                { name: 'docker', status: 'up' },
            ],
        });
    });

    it('reports error when a single probe resolves false, marking only it down', async () => {
        const result = await checkReadinessUseCase([
            upProbe('postgres', true),
            upProbe('docker', false),
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
            upProbe('postgres', false),
            upProbe('docker', false),
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
            upProbe('postgres', true),
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

    it('reports ok with the six services of the stack up', async () => {
        const result = await checkReadinessUseCase([
            upProbe('postgres', true),
            upProbe('docker', true),
            upProbe('redis', true),
            upProbe('proxy', true),
            upProbe('backend', true),
            upProbe('frontend', true),
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

    it('reports error when a single service of the stack is down, marking only it down', async () => {
        const result = await checkReadinessUseCase([
            upProbe('postgres', true),
            upProbe('docker', true),
            upProbe('redis', false),
            upProbe('proxy', true),
            upProbe('backend', true),
            upProbe('frontend', true),
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
            upProbe('docker', true),
            upProbe('postgres', true),
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
