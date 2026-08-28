import type { DependencyStatus, ReadinessResult } from '@gitpaas/contracts';

import { HealthProbe } from '../domain/ports/health-probe.port';

/**
 * Use case for checking whether the server's critical dependencies are ready.
 *
 * @param probes Health probes for the dependencies to check
 *
 * @returns Overall status and a per-dependency breakdown
 */
export async function checkReadinessUseCase(probes: HealthProbe[]): Promise<ReadinessResult> {
    const dependencies: DependencyStatus[] = await Promise.all(
        probes.map(async (probe) => {
            try {
                return { name: probe.name, status: await probe.check() };
            } catch {
                return { name: probe.name, status: 'down' as const };
            }
        }),
    );

    const status = dependencies.some((dependency) => dependency.status === 'down') ? 'error' : 'ok';

    return { status, dependencies };
}
