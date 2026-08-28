import type { DependencyState } from '@gitpaas/contracts';

import { HealthProbe } from '../../domain/ports/health-probe.port';

import type { RuntimeContainerSummary } from '@core/domain/models/container-runtime.models';
import type { ContainerRuntime } from '@core/domain/ports/container-runtime.port';

/**
 * Health probe of one container of the GitPaaS stack.
 */
export abstract class StackContainerHealthProbeAdapter implements HealthProbe {
    /**
     * Name of the dependency this probe reports.
     */
    public abstract readonly name: string;

    /**
     * Name the container of the stack carries in the runtime.
     */
    protected abstract readonly containerName: string;

    constructor(protected readonly client: ContainerRuntime) {}

    public async check(): Promise<DependencyState> {
        if (process.env.NODE_ENV !== 'production') {
            return 'not-applicable';
        }

        try {
            const containers = await this.client.listContainers({}, true);

            return containers.some((container) => this.isNamed(container) && container.state === 'running')
                ? 'up'
                : 'down';
        } catch {
            return 'down';
        }
    }

    /**
     * Tells whether a container carries the name this probe watches.
     *
     * @param container Container summary returned by the runtime
     *
     * @returns True when the container is the one this probe watches
     */
    private isNamed(container: RuntimeContainerSummary): boolean {
        return container.names.some((name) => name.replace(/^\//, '') === this.containerName);
    }
}
