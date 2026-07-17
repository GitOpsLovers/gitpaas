import { DependencyStatus, ReadinessResult } from '../domain/models/readiness-result.model';
import { HealthProbe } from '../domain/repositories/health-probe.repository';

/**
 * Use case for checking whether the server's critical dependencies are ready.
 *
 * Runs every probe in parallel and aggregates the results. A probe that
 * resolves `false` — or throws — is reported as `down`; this function never
 * rejects on a probe failure. The overall status is `ok` only when every
 * dependency is `up`.
 *
 * @param probes Health probes for the dependencies to check
 *
 * @returns Overall status and a per-dependency breakdown
 */
export async function checkReadinessUseCase(probes: HealthProbe[]): Promise<ReadinessResult> {
    const dependencies: DependencyStatus[] = await Promise.all(
        probes.map(async (probe) => {
            try {
                const up = await probe.check();

                return { name: probe.name, status: up ? 'up' : 'down' };
            } catch {
                return { name: probe.name, status: 'down' };
            }
        }),
    );

    const status = dependencies.every((dependency) => dependency.status === 'up') ? 'ok' : 'error';

    return { status, dependencies };
}
